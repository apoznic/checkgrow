import { useNavigate } from 'react-router-dom';
import { Home, Settings, LogOut, User, ChevronDown, Users, FolderOpen, Building2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppTopBarProps {
  onOpenSettings?: () => void;
  showLogo?: boolean;
  userName?: string | null;
  avatarUrl?: string | null;
}

export function AppTopBar({ onOpenSettings, showLogo = true, userName, avatarUrl }: AppTopBarProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="sticky top-0 z-50 w-full border-b border-border/30 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-12 px-4 sm:px-6">
        {/* Left: Logo / Home */}
        <div className="flex items-center gap-3">
          {showLogo && (
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Logo size="sm" />
            </button>
          )}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-secondary/50"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <button
            onClick={() => {
              sessionStorage.setItem('admin_active_tab', 'projects');
              navigate('/admin');
            }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-secondary/50"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Projects</span>
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-secondary/50"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">My Organization</span>
          </button>
          <button
            onClick={() => navigate('/connect')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-secondary/50"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Connect</span>
          </button>
        </div>

        {/* Right: Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-secondary/50 transition-colors">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <span className="text-sm font-medium hidden sm:inline max-w-[120px] truncate">
                {userName || 'Account'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/account')}>
              <User className="w-4 h-4 mr-2" />
              Account Settings
            </DropdownMenuItem>
            {onOpenSettings && (
              <DropdownMenuItem onClick={onOpenSettings}>
                <Settings className="w-4 h-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => navigate('/dashboard')}>
              <Home className="w-4 h-4 mr-2" />
              Back to Dashboard
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
