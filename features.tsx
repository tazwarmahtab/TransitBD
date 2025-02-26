import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { MapPin, Mic, Wallet, Clock, BusFront, Languages } from "lucide-react";

export function Features() {
  const { t } = useTranslation();
  
  const features = [
    {
      icon: MapPin,
      title: t('features.navigation.title'),
      description: t('features.navigation.description')
    },
    {
      icon: Mic,
      title: t('features.voice.title'),
      description: t('features.voice.description')
    },
    {
      icon: Wallet,
      title: t('features.payments.title'),
      description: t('features.payments.description')
    },
    {
      icon: Clock,
      title: t('features.realtime.title'),
      description: t('features.realtime.description')
    },
    {
      icon: BusFront,
      title: t('features.multimodal.title'),
      description: t('features.multimodal.description')
    },
    {
      icon: Languages,
      title: t('features.language.title'),
      description: t('features.language.description')
    }
  ];

  return (
    <section className="py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          {t('features.title')}
        </h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <Card key={i}>
              <CardHeader>
                <feature.icon className="h-8 w-8 mb-4 text-primary" />
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
