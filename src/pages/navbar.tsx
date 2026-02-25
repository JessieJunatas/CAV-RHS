import { Link, useLocation } from "react-router-dom";
import {
  BookText,
  Menu,
  Info,
  Logs,
  X,
  ChevronRight,
  ArchiveRestore,
  LogOut,
  User as _UserIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { JSX } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { ThemeTogglerButton } from "../components/theme-toggler";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface MenuItem {
  title: string;
  url: string;
  description?: string;
  icon?: JSX.Element;
  items?: MenuItem[];
}

interface NavbarProps {
  logo?: {
    url: string;
    src: string;
    alt: string;
    title: string;
  };
  menu?: MenuItem[];
}

const Navbar = ({
  logo = {
    url: "/",
    src: "/RHS-Logo.png",
    alt: "RHS Logo",
    title: "Auto-Forms",
  },
  menu = [
    { title: "Home", url: "/" },
    {
      title: "Forms",
      url: "/forms",
      items: [
        {
          title: "C.A.V Forms",
          description:
            "Retrieve and auto-complete Certification, Authentication, and Verification.",
          icon: <BookText className="size-4 shrink-0" />,
          url: "/forms/cav",
        },
        {
          title: "SF-10 Forms",
          description:
            "Streamline the creation of SF-10 forms with auto-fill capabilities.",
          icon: <BookText className="size-4 shrink-0" />,
          url: "/forms/sf10",
        },
      ],
    },
    {
      title: "Information",
      url: "/information",
      items: [
        {
          title: "About System",
          description: "Get all the answers you need right here",
          icon: <Info className="size-4 shrink-0" />,
          url: "/about",
        },
        {
          title: "Audit Logs",
          description: "Track system changes here.",
          icon: <Logs className="size-4 shrink-0" />,
          url: "/audit-logs",
        },
        {
          title: "Archive",
          description: "View archived data here.",
          icon: <ArchiveRestore className="size-4 shrink-0" />,
          url: "/archive",
        },
      ],
    },
    { title: "Docs", url: "/docs" },
    { title: "Login", url: "/login" },
  ],
}: NavbarProps) => {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
    setSignOutDialogOpen(false);
  };

  // Derive a display name: use email prefix or full_name from metadata
  const displayName =
    user?.user_metadata?.full_name ??
    user?.email?.split("@")[0] ??
    "User";
  const displayEmail = user?.email ?? "";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <header
        className={`
          sticky top-0 z-50 w-full
          transition-all duration-300 ease-in-out
          ${
            scrolled
              ? "bg-background/80 backdrop-blur-md border-b border-border/60 shadow-sm"
              : "bg-background border-b border-transparent"
          }
        `}
      >
        {/* ── Desktop ── */}
        <nav className="hidden lg:flex items-center justify-between px-8 h-16 max-w-screen-xl mx-auto w-full">
          {/* Logo */}
          <Link to={logo.url} className="flex items-center gap-2.5 group shrink-0">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-primary/8 group-hover:bg-primary/14 transition-colors">
              <img
                src={logo.src}
                className="w-10 h-10 object-contain"
                alt={logo.alt}
              />
            </div>
            <span className="text-base font-semibold tracking-tight text-foreground">
              {logo.title}
            </span>
          </Link>

          {/* Nav items */}
          <NavigationMenu className="mx-6">
            <NavigationMenuList className="gap-1">
              {menu.map((item) => renderMenuItem(item, location.pathname))}
            </NavigationMenuList>
          </NavigationMenu>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <ThemeTogglerButton variant="ghost" />
            <div className="w-px h-5 bg-border mx-1" />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {/* Avatar circle */}
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-semibold select-none">
                      {avatarInitial}
                    </div>
                    <span className="text-sm font-medium text-foreground max-w-[120px] truncate">
                      {displayName}
                    </span>
                    <ChevronRight className="size-3 text-muted-foreground rotate-90" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="font-medium">{displayName}</span>
                    <span className="text-xs font-normal text-muted-foreground truncate">
                      {displayEmail}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                    onClick={() => setSignOutDialogOpen(true)}
                  >
                    <LogOut className="size-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                <Button size="sm" className="h-8 px-4 text-sm font-medium">
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        </nav>

        {/* ── Mobile ── */}
        <div className="flex lg:hidden items-center justify-between px-4 h-14">
          <Link to={logo.url} className="flex items-center gap-2">
            <img src={logo.src} className="w-7 h-7 object-contain" alt={logo.alt} />
            <span className="text-base font-semibold tracking-tight">
              {logo.title}
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            <ThemeTogglerButton variant="ghost" />
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="size-9 rounded-lg">
                  {mobileOpen ? (
                    <X className="size-4" />
                  ) : (
                    <Menu className="size-4" />
                  )}
                </Button>
              </SheetTrigger>

              <SheetContent
                side="right"
                className="w-80 px-0 py-0 flex flex-col overflow-hidden"
              >
                <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/60">
                  <SheetTitle>
                    <Link to={logo.url} className="flex items-center gap-2.5">
                      <img
                        src={logo.src}
                        className="w-7 h-7 object-contain"
                        alt={logo.alt}
                      />
                      <span className="text-base font-semibold">
                        {logo.title}
                      </span>
                    </Link>
                  </SheetTitle>
                </SheetHeader>

                {/* Mobile user info */}
                {user && (
                  <div className="flex items-center gap-3 px-5 py-3 border-b border-border/60 bg-muted/30">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold select-none shrink-0">
                      {avatarInitial}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{displayName}</span>
                      <span className="text-xs text-muted-foreground truncate">{displayEmail}</span>
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <Accordion
                    type="single"
                    collapsible
                    className="w-full space-y-1"
                  >
                    {menu
                      .filter((item) => item.title !== "Login")
                      .map((item) =>
                        renderMobileMenuItem(item, location.pathname)
                      )}
                  </Accordion>
                </div>

                {/* Mobile footer CTA */}
                <div className="px-4 py-4 border-t border-border/60">
                  {user ? (
                    <button
                      className="w-full flex items-center justify-center gap-2 h-10 text-sm font-medium rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
                      onClick={() => {
                        setMobileOpen(false);
                        setSignOutDialogOpen(true);
                      }}
                    >
                      <LogOut className="size-4" />
                      Sign out
                    </button>
                  ) : (
                    <Link to="/login" className="block">
                      <Button className="w-full h-10 text-sm font-medium rounded-lg">
                        Sign in
                      </Button>
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <AlertDialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll be signed out of <span className="font-medium text-foreground">{displayEmail}</span>. Any unsaved changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const renderMenuItem = (item: MenuItem, pathname: string) => {
  const isActive = pathname === item.url || pathname.startsWith(item.url + "/");
  if (item.title === "Login") return null;

  if (item.items) {
    return (
      <NavigationMenuItem key={item.title}>
        <NavigationMenuTrigger
          className={`h-9 px-3 text-sm rounded-lg font-medium ${
            isActive
              ? "text-foreground bg-muted"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          {item.title}
        </NavigationMenuTrigger>

        <NavigationMenuContent>
          <ul className="w-72 p-2 space-y-0.5">
            <NavigationMenuLink asChild>
              <>
                {item.items.map((subItem) => (
                  <li key={subItem.title}>
                    <Link
                      to={subItem.url}
                      className="flex items-start gap-3 rounded-lg p-3 hover:bg-muted"
                    >
                      {subItem.icon}
                      <div>
                        <p className="text-sm font-medium">{subItem.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {subItem.description}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </>
            </NavigationMenuLink>
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem key={item.title}>
      <Link
        to={item.url}
        className={`inline-flex h-9 items-center px-3 rounded-lg text-sm font-medium ${
          isActive
            ? "text-foreground bg-muted"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        }`}
      >
        {item.title}
      </Link>
    </NavigationMenuItem>
  );
};

/* ───────────────── Mobile renderer ───────────────── */
const renderMobileMenuItem = (item: MenuItem, _pathname: string) => {
  if (item.items) {
    return (
      <AccordionItem key={item.title} value={item.title} className="border-0">
        <AccordionTrigger className="px-3 py-2.5 rounded-lg text-sm font-medium">
          {item.title}
        </AccordionTrigger>
        <AccordionContent className="pl-4">
          {item.items.map((sub) => (
            <Link
              key={sub.title}
              to={sub.url}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted"
            >
              {sub.icon}
              <span className="text-sm">{sub.title}</span>
              <ChevronRight className="ml-auto size-3 opacity-50" />
            </Link>
          ))}
        </AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <Link
      key={item.title}
      to={item.url}
      className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted"
    >
      {item.title}
    </Link>
  );
};

export { Navbar };
