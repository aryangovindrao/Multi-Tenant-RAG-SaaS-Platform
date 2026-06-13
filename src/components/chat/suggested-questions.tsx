"use client";

import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { useSuggestedQuestions } from "@/hooks/use-chat";

interface SuggestedQuestionsProps {
  conversationId: string;
  onSelect: (question: string) => void;
}

export function SuggestedQuestions({
  conversationId,
  onSelect,
}: SuggestedQuestionsProps) {
  const { data: questions } = useSuggestedQuestions(conversationId);
  if (!questions?.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        <Lightbulb className="size-3.5" />
        Suggested questions
      </p>
      <div className="flex flex-wrap gap-2">
        {questions.slice(0, 4).map((q, i) => (
          <motion.button
            key={q}
            type="button"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => onSelect(q)}
            className="bg-muted/60 hover:bg-accent rounded-full border px-3 py-1.5 text-left text-xs transition-colors"
          >
            {q}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
