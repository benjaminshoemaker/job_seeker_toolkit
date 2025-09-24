import { communityLinks, openContribute } from "../../lib/contribute";
import { Github } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
          <div>
            <h4 className="font-medium mb-3">About</h4>
            <p className="text-sm text-muted-foreground">
              Built to help job seekers succeed. This open source toolkit provides curated tools and resources to make the job search process just a little bit easier.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-3">Contribute</h4>
            <div className="space-y-2 text-sm">
              <button onClick={() => openContribute('bug')} className="block text-muted-foreground hover:text-foreground transition-colors">
                Report bugs & issues
              </button>
              <button onClick={() => openContribute('feature')} className="block text-muted-foreground hover:text-foreground transition-colors">
                Suggest new tools
              </button>
              <button onClick={() => openContribute('code')} className="block text-muted-foreground hover:text-foreground transition-colors">
                Contribute code
              </button>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3">Community</h4>
            <div className="space-y-2 text-sm">
              <button onClick={() => window.open(communityLinks.discussions, '_blank')} className="block text-muted-foreground hover:text-foreground transition-colors">
                Join discussions
              </button>
              <button onClick={() => window.open(communityLinks.repo, '_blank')} className="block text-muted-foreground hover:text-foreground transition-colors">
                GitHub repository
              </button>
            </div>
          </div>
        </div>
        <div className="text-center pt-6 border-t">
          <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground mb-2">
            <Github className="w-4 h-4" />
            <span>Open source and community maintained</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Missing a tool? Help us improve by contributing to the project.
          </p>
        </div>
      </div>
    </footer>
  );
}

