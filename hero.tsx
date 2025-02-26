import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { MapPin, Mic, Wallet } from "lucide-react";
import { motion } from "framer-motion";

const imageVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  hover: { scale: 1.05, transition: { duration: 0.2 } }
};

export function Hero() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden bg-background pt-16 md:pt-24">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-2 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                {t('hero.title')}
              </h1>
              <p className="mt-4 text-xl text-muted-foreground">
                {t('hero.subtitle')}
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild>
                  <a href="#waitlist">{t('hero.cta')}</a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="/auth">{t('hero.secondary_cta')}</a>
                </Button>
              </div>
            </motion.div>
          </div>
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <motion.div
                  variants={imageVariants}
                  initial="initial"
                  animate="animate"
                  whileHover="hover"
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="relative aspect-video rounded-lg overflow-hidden shadow-lg bg-muted"
                >
                  <img 
                    src="/images/dhaka-bus.svg"
                    alt="Dhaka Local Bus"
                    className="object-cover w-full h-full"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </motion.div>
                <motion.div
                  variants={imageVariants}
                  initial="initial"
                  animate="animate"
                  whileHover="hover"
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="relative aspect-video rounded-lg overflow-hidden shadow-lg bg-muted"
                >
                  <img 
                    src="/images/transport-network.svg"
                    alt="Dhaka City Transport"
                    className="object-cover w-full h-full"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </motion.div>
              </div>
              <div className="space-y-4 pt-8">
                <motion.div
                  variants={imageVariants}
                  initial="initial"
                  animate="animate"
                  whileHover="hover"
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="relative aspect-video rounded-lg overflow-hidden shadow-lg bg-muted"
                >
                  <img 
                    src="/images/dhaka-metro.svg"
                    alt="Dhaka Metro Rail"
                    className="object-cover w-full h-full"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </motion.div>
                <motion.div
                  variants={imageVariants}
                  initial="initial"
                  animate="animate"
                  whileHover="hover"
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="relative aspect-video rounded-lg overflow-hidden shadow-lg bg-muted"
                >
                  <img 
                    src="/images/digital-payment.svg"
                    alt="Digital Payment"
                    className="object-cover w-full h-full"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}