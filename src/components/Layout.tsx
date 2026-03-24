import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Package, Beaker, Factory, Truck, Users, ShoppingCart, CalendarClock, Settings, ChevronDown, Mail, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, isAdmin, isEditor, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: "Products", href: "/", icon: Package },
    { name: "Ingredients", href: "/ingredients", icon: Beaker },
    { name: "Suppliers", href: "/suppliers", icon: Truck },
    { name: "Manufacturers", href: "/manufacturers", icon: Factory },
    { name: "Procurement", href: "/procurement", icon: ShoppingCart },
    ...(isAdmin ? [{ name: "Users", href: "/users", icon: Users }] : []),
    ...(isAdmin ? [{ name: "Batch Upload", href: "/batch-upload", icon: Upload }] : []),
    ...((isAdmin || isEditor) ? [{ name: "Reporting", href: "/scheduled-exports", icon: CalendarClock }] : []),
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card shadow-soft">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <h1 className="text-xl font-semibold text-primary">
                  Recip3
                </h1>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 h-auto py-2">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium">{user.email}</span>
                    {isAdmin && (
                      <span className="text-xs text-primary font-semibold">Admin</span>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/my-subscriptions")} className="cursor-pointer">
                  <Mail className="h-4 w-4 mr-2" />
                  My Subscriptions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
