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
import { useState } from "react";

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
  icon: React.ReactNode;
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
    id: "resume-builder",
    title: "Resume Builder",
    description: "Build and customize professional resumes with industry-specific templates.",
    detailedDescription: "Professional resume builders help you create ATS-friendly resumes that pass through automated screening systems and impress hiring managers.",
    icon: <FileText className="w-5 h-5" />,
    badge: "External",
    category: "Application Tools",
    href: "https://resumeworded.com",
    aiSummary: "Modern resume builders offer ATS optimization, industry-specific templates, and real-time feedback. The key is finding one that balances visual appeal with ATS compatibility.",
    options: [
      {
        name: "Resume Worded",
        description: "AI-powered resume optimization with real-time feedback and ATS scoring.",
        href: "https://resumeworded.com",
        rating: 4.8,
        pros: ["ATS optimization", "Real-time feedback", "Industry-specific tips"],
        cons: ["Limited free version", "Can be overwhelming for beginners"],
        pricing: "Free tier available, Pro plans from $19/month"
      },
      {
        name: "Resume.io",
        description: "Professional templates with easy drag-and-drop interface.",
        href: "https://resume.io",
        rating: 4.5,
        pros: ["Beautiful templates", "User-friendly interface", "Good customization"],
        cons: ["Limited free options", "Templates can look similar"],
        pricing: "Free trial, plans from $2.95/month"
      },
      {
        name: "Canva Resume Builder",
        description: "Creative resume designs with extensive customization options.",
        href: "https://canva.com/resumes",
        rating: 4.3,
        pros: ["Creative designs", "Extensive customization", "Free options available"],
        cons: ["May not be ATS-friendly", "Can be too creative for some industries"],
        pricing: "Free tier available, Pro from $14.99/month"
      }
    ]
  },
  {
    id: "offer-evaluation",
    title: "Offer Letter Evaluation",
    description: "Analyze job offers to understand compensation, benefits, and negotiation opportunities.",
    detailedDescription: "Comprehensive offer analysis tool that evaluates total compensation, benefits packages, and provides data-driven negotiation strategies.",
    icon: <DollarSign className="w-5 h-5" />,
    badge: "Internal",
    category: "Application Tools",
    comingSoon: true,
    aiSummary: "Offer evaluation goes beyond salary - it's about understanding total compensation value, growth potential, and negotiation leverage. Our tool will provide market comparisons and negotiation scripts."
  },

  // Interview Prep
  {
    id: "interview-prep",
    title: "Interview Prep Assistant",
    description: "Practice common interview questions and get personalized feedback on your responses.",
    detailedDescription: "AI-powered interview coaching that adapts to your industry, role, and experience level with personalized question sets and feedback.",
    icon: <MessageSquare className="w-5 h-5" />,
    badge: "Internal",
    category: "Interview Prep",
    comingSoon: true,
    aiSummary: "Effective interview prep requires both technical knowledge and communication skills. Our assistant will provide industry-specific questions, behavioral scenarios, and real-time feedback to build confidence."
  },
  {
    id: "pramp",
    title: "Pramp",
    description: "Practice technical interviews with peers in a collaborative environment.",
    detailedDescription: "Peer-to-peer interview practice platform connecting you with other professionals for mock technical interviews.",
    icon: <Users className="w-5 h-5" />,
    badge: "External",
    category: "Interview Prep",
    href: "https://pramp.com",
    aiSummary: "Peer interview practice offers realistic experience and diverse perspectives. These platforms are particularly valuable for technical roles where problem-solving collaboration is key.",
    options: [
      {
        name: "Pramp",
        description: "Free peer-to-peer technical interview practice with real-time collaboration.",
        href: "https://pramp.com",
        rating: 4.6,
        pros: ["Completely free", "Real peer interaction", "Good for technical interviews"],
        cons: ["Quality depends on peers", "Limited behavioral questions", "Scheduling can be challenging"],
        pricing: "Completely free"
      },
      {
        name: "InterviewBit",
        description: "Comprehensive coding interview preparation with peer practice options.",
        href: "https://interviewbit.com",
        rating: 4.4,
        pros: ["Structured curriculum", "Company-specific prep", "Large question bank"],
        cons: ["Can be overwhelming", "Interface feels dated", "Less focus on soft skills"],
        pricing: "Free tier available, Premium from $99/year"
      }
    ]
  },
  {
    id: "leetcode",
    title: "LeetCode",
    description: "Practice coding problems and algorithms for technical interviews.",
    detailedDescription: "The leading platform for coding interview preparation with thousands of problems used by top tech companies.",
    icon: <Target className="w-5 h-5" />,
    badge: "External",
    category: "Interview Prep",
    href: "https://leetcode.com",
    aiSummary: "Coding practice platforms are essential for technical interviews. Focus on understanding patterns rather than memorizing solutions, and practice consistently over time.",
    options: [
      {
        name: "LeetCode",
        description: "Industry standard for coding interview preparation with company-specific question sets.",
        href: "https://leetcode.com",
        rating: 4.7,
        pros: ["Industry standard", "Company-specific questions", "Great community discussions"],
        cons: ["Can be intimidating for beginners", "Premium features are expensive", "Less guidance on approach"],
        pricing: "Free tier available, Premium from $35/month"
      },
      {
        name: "HackerRank",
        description: "Coding challenges with detailed explanations and multiple programming languages.",
        href: "https://hackerrank.com",
        rating: 4.3,
        pros: ["Good for beginners", "Multiple languages", "Clear explanations"],
        cons: ["Less focused on interviews", "Interface can be slow", "Limited advanced problems"],
        pricing: "Free for individuals"
      },
      {
        name: "CodeSignal",
        description: "Technical assessment platform with realistic coding environments.",
        href: "https://codesignal.com",
        rating: 4.2,
        pros: ["Realistic environments", "Good for assessment prep", "AI-powered insights"],
        cons: ["Smaller question bank", "Less community support", "More expensive"],
        pricing: "Free tier available, Pro from $99/month"
      }
    ]
  },

  // Salary & Negotiation
  {
    id: "salary-research",
    title: "Glassdoor Salary Insights",
    description: "Research salary ranges and company reviews from current and former employees.",
    detailedDescription: "Comprehensive salary and company research platform with verified employee reviews and compensation data.",
    icon: <TrendingUp className="w-5 h-5" />,
    badge: "External",
    category: "Salary & Negotiation",
    href: "https://glassdoor.com",
    aiSummary: "Salary research tools provide crucial market context for negotiations. Cross-reference multiple sources and consider location, experience level, and company size for accurate comparisons.",
    options: [
      {
        name: "Glassdoor",
        description: "Employee reviews, salary insights, and company culture information.",
        href: "https://glassdoor.com",
        rating: 4.4,
        pros: ["Large database", "Anonymous reviews", "Company insights"],
        cons: ["Self-reported data can be biased", "Requires account creation", "Limited details for smaller companies"],
        pricing: "Free with account"
      },
      {
        name: "PayScale",
        description: "Detailed salary reports with personalized compensation analysis.",
        href: "https://payscale.com",
        rating: 4.2,
        pros: ["Detailed salary reports", "Skills-based insights", "Good for market research"],
        cons: ["Requires detailed profile", "Can be slow to use", "Limited free features"],
        pricing: "Free basic reports, detailed reports from $99"
      }
    ]
  },
  {
    id: "levels-fyi",
    title: "Levels.fyi",
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
      },
      {
        name: "Blind",
        description: "Anonymous professional network with salary discussions and company insights.",
        href: "https://teamblind.com",
        rating: 4.1,
        pros: ["Anonymous discussions", "Real employee insights", "Company-specific channels"],
        cons: ["Can be toxic environment", "Unverified information", "Requires work email"],
        pricing: "Free with verification"
      }
    ]
  },

  // Career Development
  {
    id: "linkedin-learning",
    title: "LinkedIn Learning",
    description: "Develop new skills with thousands of courses on business, technology, and creative topics.",
    detailedDescription: "Professional development platform with courses designed for career advancement and skill building in today's job market.",
    icon: <BookOpen className="w-5 h-5" />,
    badge: "External",
    category: "Career Development",
    href: "https://linkedin.com/learning",
    aiSummary: "Online learning platforms are crucial for staying competitive. Focus on skills that complement your current role and emerging industry trends.",
    options: [
      {
        name: "LinkedIn Learning",
        description: "Professional courses with certificates that integrate with your LinkedIn profile.",
        href: "https://linkedin.com/learning",
        rating: 4.5,
        pros: ["LinkedIn integration", "Professional focus", "High-quality instructors"],
        cons: ["Subscription required", "Limited hands-on practice", "Can be expensive"],
        pricing: "$29.99/month or $239.88/year"
      },
      {
        name: "Coursera",
        description: "University-level courses and professional certificates from top institutions.",
        href: "https://coursera.org",
        rating: 4.6,
        pros: ["University partnerships", "Financial aid available", "Comprehensive programs"],
        cons: ["Some courses are expensive", "Time-intensive", "Varying quality"],
        pricing: "Free courses available, Specializations from $39-79/month"
      },
      {
        name: "Udemy",
        description: "Practical skills courses with lifetime access and frequent sales.",
        href: "https://udemy.com",
        rating: 4.3,
        pros: ["Lifetime access", "Practical focus", "Frequent sales"],
        cons: ["Quality varies widely", "No accreditation", "Can be overwhelming choice"],
        pricing: "Individual courses $10-200, frequent sales"
      }
    ]
  },
  {
    id: "coursera",
    title: "Coursera",
    description: "Take courses from top universities and companies to advance your career.",
    detailedDescription: "Academic and professional courses from leading universities and companies, offering certificates and degree programs.",
    icon: <Award className="w-5 h-5" />,
    badge: "External",
    category: "Career Development",
    href: "https://coursera.org",
    aiSummary: "University-level learning platforms provide credible credentials and structured learning paths. Best for comprehensive skill development and career transitions.",
    options: [
      {
        name: "Coursera",
        description: "University courses and professional certificates with academic rigor.",
        href: "https://coursera.org",
        rating: 4.6,
        pros: ["University partnerships", "Comprehensive programs", "Financial aid available"],
        cons: ["Can be time-intensive", "Academic pace", "Subscription model"],
        pricing: "Free courses available, Specializations from $39-79/month"
      },
      {
        name: "edX",
        description: "University-level courses with verified certificates and degree programs.",
        href: "https://edx.org",
        rating: 4.4,
        pros: ["Free audit options", "University quality", "MicroMasters programs"],
        cons: ["Academic focus", "Less career-oriented", "Limited interaction"],
        pricing: "Free audit, Verified certificates from $50-300"
      }
    ]
  }
];

const categories = ["Application Tools", "Interview Prep", "Salary & Negotiation", "Career Development"];

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

  const handleContributeClick = (type: string) => {
    const baseUrl = "https://github.com/jobseekertoolkit/toolkit";
    
    switch (type) {
      case 'bug':
        window.open(`${baseUrl}/issues/new?template=bug_report.md`, '_blank');
        break;
      case 'feature':
        window.open(`${baseUrl}/issues/new?template=feature_request.md`, '_blank');
        break;
      case 'edit':
        window.open(`${baseUrl}/edit/main/App.tsx`, '_blank');
        break;
      case 'roadmap':
        window.open(`${baseUrl}/projects/1`, '_blank');
        break;
      case 'code':
        window.open(baseUrl, '_blank');
        break;
      default:
        window.open(baseUrl, '_blank');
    }
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
    <div className="min-h-screen bg-background">
      {/* Header */}
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
                  <DropdownMenuItem onClick={() => handleContributeClick('bug')}>
                    <Bug className="w-4 h-4 mr-2" />
                    Report Bug
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleContributeClick('feature')}>
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Request Feature
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleContributeClick('edit')}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit This Page
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleContributeClick('roadmap')}>
                    <Map className="w-4 h-4 mr-2" />
                    View Roadmap
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleContributeClick('code')}>
                    <Code className="w-4 h-4 mr-2" />
                    Contribute Code
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Star className="w-4 h-4" />
                <span>Your career advancement companion</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-semibold mb-4">
            Accelerate Your Job Search
          </h2>
          <p className="text-lg text-muted-foreground mb-6">
            Discover powerful tools and resources to help you land your dream job. From crafting perfect applications to acing interviews and negotiating offers.
          </p>
          <div className="bg-muted/50 p-4 rounded-lg mb-8 text-sm">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Github className="w-4 h-4" />
              <span className="font-medium">Community-Powered & Open Source</span>
            </div>
            <p className="text-muted-foreground">
              This toolkit is built by the community, for the community. All internal tools, recommendations, and the platform itself are open source and accepting contributions.
            </p>
          </div>
          <div className="flex justify-center space-x-4">
            <Badge variant="secondary" className="text-sm">
              <Clock className="w-3 h-3 mr-1" />
              Save time
            </Badge>
            <Badge variant="secondary" className="text-sm">
              <TrendingUp className="w-3 h-3 mr-1" />
              Increase success
            </Badge>
            <Badge variant="secondary" className="text-sm">
              <Target className="w-3 h-3 mr-1" />
              Land better offers
            </Badge>
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
                    className={`transition-all duration-200 ${
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
                    <CardContent className="pt-0">
                      <CardDescription className="text-sm leading-relaxed mb-4">
                        {tool.description}
                      </CardDescription>
                      
                      <Button 
                        variant={tool.comingSoon ? "secondary" : "default"} 
                        size="sm" 
                        className="w-full"
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="font-medium">{option.name}</h5>
                          {renderStars(option.rating)}
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => window.open(option.href, '_blank')}
                          className="ml-4"
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

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            <div>
              <h4 className="font-medium mb-3">About</h4>
              <p className="text-sm text-muted-foreground">
                Built to help job seekers succeed in their career journey. This open source toolkit provides curated tools and resources for every stage of the job search process.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-3">Contribute</h4>
              <div className="space-y-2 text-sm">
                <button 
                  onClick={() => handleContributeClick('bug')}
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                >
                  Report bugs & issues
                </button>
                <button 
                  onClick={() => handleContributeClick('feature')}
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                >
                  Suggest new tools
                </button>
                <button 
                  onClick={() => handleContributeClick('code')}
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contribute code
                </button>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Community</h4>
              <div className="space-y-2 text-sm">
                <button 
                  onClick={() => handleContributeClick('roadmap')}
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                >
                  View roadmap
                </button>
                <button 
                  onClick={() => window.open('https://github.com/jobseekertoolkit/toolkit/discussions', '_blank')}
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                >
                  Join discussions
                </button>
                <button 
                  onClick={() => window.open('https://github.com/jobseekertoolkit/toolkit', '_blank')}
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                >
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
    </div>
  );
}
