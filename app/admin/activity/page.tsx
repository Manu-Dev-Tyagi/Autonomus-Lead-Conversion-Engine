"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, 
  User, 
  Zap, 
  Target, 
  MessageSquare, 
  Calendar, 
  CheckCircle2, 
  Cpu,
  ArrowRight
} from "lucide-react";

interface ActivityItem {
  id: string;
  leadId: string;
  leadName?: string;
  action: string;
  reasoning: string;
  confidence: number;
  occurredAt: string;
  status: "success" | "pending" | "failed";
}

const actionIcons: Record<string, React.ReactNode> = {
  ENRICH_LEAD: <Zap className="w-5 h-5 text-blue-400" />,
  SCORE_LEAD: <Target className="w-5 h-5 text-purple-400" />,
  PLAN_SEQUENCE: <Activity className="w-5 h-5 text-indigo-400" />,
  COMPOSE_MESSAGE: <MessageSquare className="w-5 h-5 text-cyan-400" />,
  INTERPRET_RESPONSE: <Cpu className="w-5 h-5 text-pink-400" />,
  SCHEDULE_MEETING: <Calendar className="w-5 h-5 text-emerald-400" />,
  ORCHESTRATE_WORKFLOW: <ArrowRight className="w-5 h-5 text-amber-400" />,
};

export default function LeadActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-url.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"
  );

  useEffect(() => {
    // Initial fetch of recent decisions
    const fetchRecentActivities = async () => {
      const { data, error } = await supabase
        .from("agent_decisions")
        .select(`
          id,
          lead_id,
          decision,
          occurred_at
        `)
        .order("occurred_at", { ascending: false })
        .limit(20);

      if (data) {
        const mapped = data.map((row: any) => ({
          id: row.id,
          leadId: row.lead_id,
          action: row.decision.action,
          reasoning: row.decision.reasoning,
          confidence: row.decision.confidence,
          occurredAt: row.occurred_at,
          status: "success" as const,
        }));
        setActivities(mapped);
      }
    };

    fetchRecentActivities();

    // Subscribe to new decisions for real-time updates
    const channel = supabase
      .channel("realtime-decisions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_decisions" },
        (payload: any) => {
          const newActivity: ActivityItem = {
            id: payload.new.id,
            leadId: payload.new.lead_id,
            action: payload.new.decision.action,
            reasoning: payload.new.decision.reasoning,
            confidence: payload.new.decision.confidence,
            occurredAt: payload.new.occurred_at,
            status: "success" as const,
          };
          setActivities((current) => [newActivity, ...current].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div className="min-h-screen bg-[#050608] text-white p-8 font-sans selection:bg-purple-500/30">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">
              Live Activity Feed
            </h1>
            <p className="text-gray-400 text-lg">
              Observe your Autonomous Lead Engine in real-time.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md">
              <span className="text-xs text-gray-500 uppercase block mb-1">Active Agents</span>
              <span className="text-xl font-mono text-blue-400">10 Working</span>
            </div>
          </div>
        </header>

        {/* Timeline Container */}
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-[39px] top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 via-purple-500/50 to-transparent z-0" />

          <div className="space-y-8 relative z-10">
            <AnimatePresence initial={false}>
              {activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20, y: -20 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="flex items-start gap-8 group"
                >
                  {/* Icon Node */}
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 bg-[#0a0c10] border border-white/10 rounded-2xl flex items-center justify-center relative z-10 shadow-2xl group-hover:border-purple-500/50 transition-colors duration-500">
                      {actionIcons[activity.action] || <Cpu className="w-5 h-5 text-gray-400" />}
                      <div className="absolute -inset-1 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {/* Confidence Pulse */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500/20 rounded-full border border-emerald-500/50 flex items-center justify-center z-20 backdrop-blur-sm">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    </div>
                  </div>

                  {/* Content Card */}
                  <div className="flex-grow bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:bg-white/[0.08] transition-all duration-300 relative group-hover:translate-x-1">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs uppercase tracking-widest text-blue-400 font-bold">
                            {activity.action.replace("_", " ")}
                          </span>
                          <span className="text-gray-600">•</span>
                          <span className="text-xs text-gray-400 italic">
                            {new Date(activity.occurredAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-white group-hover:text-blue-200 transition-colors">
                          Lead: {activity.leadId.slice(0, 8)}...
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block mb-1 uppercase">Confidence</span>
                        <span className="text-lg font-mono text-purple-400">
                          {Math.round(activity.confidence * 100)}%
                        </span>
                      </div>
                    </div>

                    <p className="text-gray-300 leading-relaxed max-w-2xl text-sm italic">
                      &quot;{activity.reasoning}&quot;
                    </p>

                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>Consumer: Manual Trigger</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400/80">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Execution Success</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {activities.length === 0 && (
              <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-3xl">
                <p className="text-gray-500">No live activities detected. Run the simulation to see agents in action.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        body {
          background-color: #050608;
        }
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #050608;
        }
        ::-webkit-scrollbar-thumb {
          background: #1a1b1e;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #2a2b2e;
        }
      `}</style>
    </div>
  );
}
