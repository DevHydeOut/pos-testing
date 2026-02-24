"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogoutButtons } from "@/components/auth/logout-button";
import { useCurrentUser } from "@/hooks/use-current-user"; // ⬅️ this hook fetches logged-in user
import { Edit, LogOutIcon } from "lucide-react";

const UserMenu = () => {
  const user = useCurrentUser();
  const initials =
    user?.name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || "U";

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="cursor-pointer">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.image || undefined} alt={user.name || user.username || "User"} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 mr-4 mt-2">
        <div className="flex flex-col items-center py-2">
        
            <div className="px-2 text-sm text-muted-foreground mb-1">
            @{user.username || "no-username"}
            </div>
            <Avatar className="h-[80px] w-[80px]">
            <AvatarImage src={user.image || undefined} alt={user.name || user.username || "User"} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {initials}
            </AvatarFallback>
            </Avatar>
            <DropdownMenuLabel className="text-sm font-medium">
            {user.name || "No Name"}
            </DropdownMenuLabel>
            
            {user.role && (
            <div className="px-2">
                <Badge className="normal-case text-xs bg-gray-100 text-gray-800 hover:bg-gray-200 rounded font-medium">
                    {user.role.replace("_", " ")}
                </Badge>
            </div>
            )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="py-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Edit /> Edit Profile
        </DropdownMenuItem>
        <LogoutButtons>
            <DropdownMenuItem className="py-2 text-muted-foreground hover:text-foreground transition-colors">
            <LogOutIcon /> Log Out
            </DropdownMenuItem>
        </LogoutButtons>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;