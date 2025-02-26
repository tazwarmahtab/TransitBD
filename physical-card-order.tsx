import { Button } from "./button";
import { Input } from "./input";
import { useTranslation } from "@/lib/i18n";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

const shippingSchema = z.object({
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().min(4, "Postal code is required"),
  phoneNumber: z.string().min(11, "Phone number is required"),
});

type ShippingFormData = z.infer<typeof shippingSchema>;

export function PhysicalCardOrder() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      address: "",
      city: "",
      postalCode: "",
      phoneNumber: "",
    },
  });

  const onSubmit = async (data: ShippingFormData) => {
    try {
      await apiRequest("POST", "/api/physical-card/order", {
        shippingAddress: data,
      });

      toast({
        title: t('physical_card.order_success'),
        description: t('physical_card.order_success_description'),
      });

      queryClient.invalidateQueries({ queryKey: ["/api/physical-card/status"] });
      setOpen(false);
    } catch (error) {
      toast({
        title: t('physical_card.order_error'),
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          {t('physical_card.order_card')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('physical_card.order_title')}</DialogTitle>
          <DialogDescription>
            {t('physical_card.order_description')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('physical_card.address')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('physical_card.address_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('physical_card.city')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('physical_card.city_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('physical_card.postal_code')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('physical_card.postal_code_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('physical_card.phone_number')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('physical_card.phone_number_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              {t('physical_card.submit_order')}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
