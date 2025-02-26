import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/lib/i18n";
import { Link, useLocation } from "wouter";
import { Button } from "./button";
import { LanguageToggle } from "./language-toggle";
import { useScroll } from "@/hooks/use-scroll";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Wallet,
  LogOut,
  Menu
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { FloatingAssistant } from "./floating-assistant";
import { TutorialAvatar } from "./tutorial-avatar";

export function Navigation() {
  const { t } = useTranslation();
  const { user, logoutMutation } = useAuth();
  const { scrollDirection, isAtTop } = useScroll();
  const [location] = useLocation();
  const isMapPage = location === "/dashboard";

  return (
    <>
      <nav className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300 ease-in-out",
        !isAtTop && "shadow-lg",
        scrollDirection === 'down' && !isAtTop && !isMapPage && "-translate-y-full",
        isMapPage ? "bg-background/40 backdrop-blur-lg" : "bg-background/80 backdrop-blur-sm border-b"
      )}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <img src="/logo.svg" alt="TransitBD Logo" className="h-10 w-auto" />
            <span className="text-lg font-semibold text-primary leading-none">TransitBD</span>
          </Link>

          <div className="flex items-center space-x-4 h-full">
            <div className="flex items-center h-full">
              <LanguageToggle />
            </div>

            {user ? (
              <>
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-4 h-full">
                  <Button variant="ghost" asChild className="flex items-center h-10" data-tutorial="map">
                    <Link href="/dashboard" className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>{t('navigation.live_map')}</span>
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild className="flex items-center h-10" data-tutorial="transit-card">
                    <Link href="/transit-card" className="flex items-center space-x-2">
                      <Wallet className="h-4 w-4" />
                      <span>{t('navigation.transit_card')}</span>
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                    className="flex items-center space-x-2 h-10"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{t('navigation.logout')}</span>
                  </Button>
                </div>

                {/* Mobile Navigation */}
                <div className="md:hidden flex items-center h-full">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard" className="flex items-center space-x-2" data-tutorial="map">
                          <MapPin className="h-4 w-4" />
                          <span>{t('navigation.live_map')}</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/transit-card" className="flex items-center space-x-2" data-tutorial="transit-card">
                          <Wallet className="h-4 w-4" />
                          <span>{t('navigation.transit_card')}</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => logoutMutation.mutate()}
                        disabled={logoutMutation.isPending}
                        className="flex items-center space-x-2"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{t('navigation.logout')}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            ) : (
              <Button asChild className="bg-primary hover:bg-primary/90 h-10">
                <Link href="/auth">{t('login')}</Link>
              </Button>
            )}
          </div>
        </div>
      </nav>
      {user && <FloatingAssistant />}
    </>
  );
}