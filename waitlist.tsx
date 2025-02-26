import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function Waitlist() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  
  const waitlistMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiRequest("POST", "/api/waitlist", { email });
    },
    onSuccess: () => {
      toast({
        title: t('waitlist.success.title'),
        description: t('waitlist.success.description'),
      });
      setEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: t('waitlist.error.title'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    waitlistMutation.mutate(email);
  };

  return (
    <section id="waitlist" className="py-24">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        <h2 className="text-3xl font-bold mb-4">
          {t('waitlist.title')}
        </h2>
        <p className="text-xl text-muted-foreground mb-8">
          {t('waitlist.subtitle')}
        </p>
        <form onSubmit={handleSubmit} className="flex gap-4 max-w-md mx-auto">
          <Input
            type="email"
            placeholder={t('waitlist.placeholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" disabled={waitlistMutation.isPending}>
            {waitlistMutation.isPending ? t('waitlist.submitting') : t('waitlist.submit')}
          </Button>
        </form>
      </div>
    </section>
  );
}
