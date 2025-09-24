import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Briefcase, ChevronDown, Code, Edit, Github, Heart, Lightbulb, Map, Bug } from "lucide-react";
import { openContribute } from "../../lib/contribute";

export function SiteHeader() {
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Briefcase className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-semibold">Job Seeker Toolkit</h1>
            <Badge variant="outline" className="ml-2 text-xs">
              <Github className="w-3 h-3 mr-1" />
              Open Source
            </Badge>
          </div>
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="outline" size="sm">
                  <Heart className="w-4 h-4 mr-2" />
                  Contribute
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => openContribute('bug')}>
                  <Bug className="w-4 h-4 mr-2" />
                  Report Bug
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openContribute('feature')}>
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Request Feature
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openContribute('edit')}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit This Page
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openContribute('code')}>
                  <Code className="w-4 h-4 mr-2" />
                  Contribute Code
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Removed tagline and decorative star */}
          </div>
        </div>
      </div>
    </header>
  );
}
