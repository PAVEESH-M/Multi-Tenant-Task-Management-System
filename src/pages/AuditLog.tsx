import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function AuditLog() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const actionColors: Record<string, string> = {
    created: "bg-success/10 text-success",
    updated: "bg-primary/10 text-primary",
    deleted: "bg-destructive/10 text-destructive",
  };

  return (
    <AppLayout>
      <div className="max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
          <p className="text-muted-foreground text-sm">Track all task activities in your organization</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" /> Activity History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : !logs?.length ? (
              <p className="text-muted-foreground text-sm">No activity recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => {
                  const details = log.details as Record<string, any> | null;
                  return (
                    <div key={log.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize mt-0.5 ${actionColors[log.action]}`}>
                        {log.action}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          {details?.title ? `"${details.title}"` : "Task"} was {log.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
