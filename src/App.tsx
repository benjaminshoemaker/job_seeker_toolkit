import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Separator } from "./components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
import { 
  FileText, 
  MessageSquare, 
  DollarSign, 
  Briefcase, 
  ExternalLink, 
  Star,
  Clock,
  TrendingUp,
  Users,
  BookOpen,
  Target,
  Award,
  ThumbsUp,
  ThumbsDown,
  X,
  Heart,
  ChevronDown,
  Bug,
  Lightbulb,
  Edit,
  Map,
  Code,
  Github
} from "lucide-react";
import { useState, type ReactNode } from "react";
import type React from "react";

interface ToolOption {
  name: string;
  description: string;
  href: string;
  rating: number;
  pros: string[];
  cons: string[];
  pricing: string;
}

interface Tool {
  id: string;
  title: string;
  description: string;
  detailedDescription: string;
  icon: ReactNode;
  badge: "Internal" | "External";
  category: string;
  href?: string;
  comingSoon?: boolean;
  options?: ToolOption[];
  aiSummary?: string;
}

const tools: Tool[] = [
  // Application Tools
  {
    id: "cover-letter",
    title: "AI Cover Letter Generator",
    description: "Create personalized cover letters tailored to specific job postings and companies.",
    detailedDescription: "Our AI-powered cover letter generator analyzes job descriptions and company information to create compelling, personalized cover letters that stand out to recruiters.",
    icon: <FileText className="w-5 h-5" />,
    badge: "Internal",
    category: "Application Tools",
    comingSoon: false,
    href: "/tools/cover-letter",
    aiSummary: "AI-generated cover letters are becoming essential in modern job applications. Our tool will analyze job postings, company culture, and your background to create tailored letters that significantly improve response rates."
  },
  {
    id: "offer-evaluation",
    title: "Offer Letter Evaluation",
    description: "Analyze job offers to understand compensation, benefits, and negotiation opportunities.",
    detailedDescription: "Comprehensive offer analysis tool that evaluates total compensation, benefits packages, and provides data-driven negotiation strategies.",
    icon: <DollarSign className="w-5 h-5" />,
    badge: "Internal",
    category: "Salary & Negotiation",
    comingSoon: true,
    aiSummary: "Offer evaluation goes beyond salary - it's about understanding total compensation value, growth potential, and negotiation leverage. Our tool will provide market comparisons and negotiation scripts."
  },

  // Interview Prep
  {
    id: "interview-prep",
    title: "Interview Prep Assistant",
    description: "Practice common interview questions and give you the tools to succeed and evalute the role & company.",
    detailedDescription: "AI-powered interview coaching that adapts to your industry, role, and experience level with personalized question sets.",
    icon: <MessageSquare className="w-5 h-5" />,
    badge: "Internal",
    category: "Interview Prep",
    comingSoon: true,
    aiSummary: "Effective interview prep requires both technical knowledge and communication skills. Our assistant will provide industry-specific questions, behavioral scenarios, and real-time feedback to build confidence."
  },
  {
    id: "company-research",
    title: "Company Research Tool",
    description: "Research any company in minutes with sourced facts, trends, and risks.",
    detailedDescription: "AI-powered; Aggregates filings, product docs, pricing, hiring data, reviews, and news; summarizes stage, traction, unit economics, leadership, and AI posture.",
    icon: <MessageSquare className="w-5 h-5" />,
    badge: "Internal",
    category: "Interview Prep",
    comingSoon: true,
    aiSummary: "Effective interview prep requires both technical knowledge and communication skills. Our assistant will provide industry-specific questions, behavioral scenarios, and real-time feedback to build confidence."
  },



  // Salary & Negotiation
  {
    id: "levels-fyi",
    title: "Compensation Comparison (Levels.fyi)",
    description: "Compare compensation packages across tech companies and career levels.",
    detailedDescription: "Detailed compensation data for tech companies including salary, equity, and bonus information across different levels and locations.",
    icon: <DollarSign className="w-5 h-5" />,
    badge: "External",
    category: "Salary & Negotiation",
    href: "https://levels.fyi",
    aiSummary: "Tech compensation tools focus on total package value including equity and bonuses. Essential for understanding market rates in the rapidly evolving tech industry.",
    options: [
      {
        name: "Levels.fyi",
        description: "Comprehensive tech compensation data with equity calculations and level comparisons.",
        href: "https://levels.fyi",
        rating: 4.8,
        pros: ["Very accurate data", "Equity calculations", "Level progression insights"],
        cons: ["Tech-focused only", "Can be overwhelming", "Limited geographic coverage"],
        pricing: "Free basic access, Premium from $99/year"
      }
    ]
  },

];

const categories = ["Application Tools", "Interview Prep", "Salary & Negotiation"];

export default function App() {
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  
  const handleToolClick = (tool: Tool) => {
    if (tool.comingSoon) {
      return;
    }
    if (tool.href) {
      if (tool.href.startsWith('/')) {
        window.location.href = tool.href;
      } else {
        window.open(tool.href, '_blank');
      }
    }
  };

  const handleCardClick = (tool: Tool, event: React.MouseEvent) => {
    // Prevent opening modal if clicking the button
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    setSelectedTool(tool);
  };

  

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`w-3 h-3 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
          />
        ))}
        <span className="text-sm ml-1">{rating}</span>
      </div>
    );
  };

  return (
    <div className="bg-background">

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-8 sm:py-12">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4">
            Accelerate Your Job Search
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground mb-6">
            Tools that I've built or used myself for the job search process. No paywalls or fluff. 
          </p>
          <div className="bg-muted/50 p-4 rounded-lg mb-8 text-sm">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Github className="w-4 h-4" />
              <span className="font-medium">Open for contributions</span>
            </div>
            <p className="text-muted-foreground">
              I built some simple utilities for the parts of the search that shouldn’t be hard or costly. Contributions welcome but optional.
            </p>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="container mx-auto px-4 pb-12">
        {categories.map((category, categoryIndex) => (
          <div key={category} className="mb-12">
            <div className="flex items-center mb-6">
              <h3 className="text-xl font-semibold">{category}</h3>
              <Separator className="ml-4 flex-1" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tools
                .filter(tool => tool.category === category)
                .map((tool) => (
                  <Card 
                    key={tool.id} 
                    className={`transition-all duration-200 flex flex-col h-full ${
                      tool.comingSoon 
                        ? 'opacity-75 cursor-not-allowed' 
                        : 'hover:shadow-md cursor-pointer hover:border-primary/20'
                    }`}
                    onClick={(e) => handleCardClick(tool, e)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            {tool.icon}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base">{tool.title}</CardTitle>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Badge 
                            variant={tool.badge === "Internal" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {tool.badge}
                          </Badge>
                          {tool.comingSoon && (
                            <Badge variant="outline" className="text-xs">
                              Soon
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 flex flex-col flex-1">
                      <CardDescription className="text-sm leading-relaxed mb-4 flex-1">
                        {tool.description}
                      </CardDescription>
                      
                      <Button 
                        variant={tool.comingSoon ? "secondary" : "default"} 
                        size="sm" 
                        className="w-full mt-auto"
                        disabled={tool.comingSoon}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToolClick(tool);
                        }}
                      >
                        {tool.comingSoon ? (
                          "Coming Soon"
                        ) : tool.badge === "External" ? (
                          <>
                            Visit Site
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </>
                        ) : (
                          "Launch Tool"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </section>

      {/* Tool Detail Modal */}
      <Dialog open={!!selectedTool} onOpenChange={() => setSelectedTool(null)}>
        <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-4xl max-h-[80vh] sm:max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                {selectedTool?.icon}
              </div>
              <div>
                <span>{selectedTool?.title}</span>
                <div className="flex space-x-2 mt-1">
                  <Badge variant={selectedTool?.badge === "Internal" ? "default" : "secondary"} className="text-xs">
                    {selectedTool?.badge}
                  </Badge>
                  {selectedTool?.comingSoon && (
                    <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                  )}
                </div>
              </div>
            </DialogTitle>
            <DialogDescription>
              {selectedTool?.detailedDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Description */}
            <div>
              {selectedTool?.aiSummary && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">💡 AI Insight</h4>
                  <p className="text-sm text-muted-foreground">{selectedTool.aiSummary}</p>
                </div>
              )}
            </div>

            {/* Tool Options */}
            {selectedTool?.options && selectedTool.options.length > 0 && (
              <div>
                <h4 className="font-medium mb-4">Recommended Options</h4>
                <div className="space-y-4">
                  {selectedTool.options.map((option, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                        <div>
                          <h5 className="font-medium">{option.name}</h5>
                          {renderStars(option.rating)}
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => window.open(option.href, '_blank')}
                          className="sm:ml-4"
                        >
                          Visit <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">{option.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <h6 className="font-medium mb-2 flex items-center">
                            <ThumbsUp className="w-3 h-3 mr-1 text-green-600" />
                            Pros
                          </h6>
                          <ul className="space-y-1">
                            {option.pros.map((pro, i) => (
                              <li key={i} className="text-muted-foreground">• {pro}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h6 className="font-medium mb-2 flex items-center">
                            <ThumbsDown className="w-3 h-3 mr-1 text-red-600" />
                            Cons
                          </h6>
                          <ul className="space-y-1">
                            {option.cons.map((con, i) => (
                              <li key={i} className="text-muted-foreground">• {con}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h6 className="font-medium mb-2 flex items-center">
                            <DollarSign className="w-3 h-3 mr-1" />
                            Pricing
                          </h6>
                          <p className="text-muted-foreground">{option.pricing}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {selectedTool?.comingSoon && (
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <h4 className="font-medium mb-2">🚀 Coming Soon</h4>
                <p className="text-sm text-muted-foreground">
                  We're working hard to bring you this tool. Stay tuned for updates!
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
