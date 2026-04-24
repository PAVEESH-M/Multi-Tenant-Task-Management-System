import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { TaskDialog } from "@/components/TaskDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

export default function Tasks() {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const logAudit = async (taskId: string, action: "created" | "updated" | "deleted", details?: Record<string, unknown>) => {
    if (!user || !userRole) return;
    await supabase.from("audit_logs").insert([{
      task_id: taskId,
      action,
      performed_by: user.id,
      organization_id: userRole.organization_id,
      details: (details as any) ?? null,
    }]);
  };

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; status: "todo" | "in_progress" | "done" }) => {
      if (!user || !userRole) throw new Error("Not authenticated");
      const { data: task, error } = await supabase
        .from("tasks")
        .insert({
          title: data.title,
          description: data.description || null,
          status: data.status,
          organization_id: userRole.organization_id,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      await logAudit(task.id, "created", { title: data.title });
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setDialogOpen(false);
      toast.success("Task created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title: string; description: string; status: "todo" | "in_progress" | "done" }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ title: data.title, description: data.description || null, status: data.status })
        .eq("id", id);
      if (error) throw error;
      await logAudit(id, "updated", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setDialogOpen(false);
      setEditingTask(null);
      toast.success("Task updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (task: Task) => {
      await logAudit(task.id, "deleted", { title: task.title });
      const { error } = await supabase.from("tasks").delete().eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canModify = (task: Task) =>
    userRole?.role === "admin" || task.created_by === user?.id;

  const handleSubmit = (data: { title: string; description: string; status: "todo" | "in_progress" | "done" }) => {
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const statusColors: Record<string, string> = {
    todo: "bg-warning/10 text-warning",
    in_progress: "bg-primary/10 text-primary",
    done: "bg-success/10 text-success",
  };

  const statusLabels: Record<string, string> = {
    todo: "To Do",
    in_progress: "In Progress",
    done: "Done",
  };

  return (
    <AppLayout>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
            <p className="text-muted-foreground text-sm">Manage your organization's tasks</p>
          </div>
          <Button onClick={() => { setEditingTask(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Task
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : !tasks?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No tasks yet. Create your first task to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <Card key={task.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center justify-between py-4 px-5">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(task.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${statusColors[task.status]}`}>
                      {statusLabels[task.status]}
                    </span>
                    {canModify(task) && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingTask(task); setDialogOpen(true); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(task)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <TaskDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          task={editingTask}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </div>
    </AppLayout>
  );
}
