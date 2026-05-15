import { useState } from "react";
import AppLayout from "@/layouts/Applayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, TrendingUp, Users } from "lucide-react";

const categories = [
  "All Categorist",
  "Artificial Intelligence",
  "Deep Learning",
  "Blockchain",
  "Natural Language Processing",
  "Internet of Things",
  "Computer Vision",
  "Data Science",
  "Augmented Reality",
  "Cyber Security",
];

const examples = [
  "machine learning for disease prediction",
  "AI in healthcare",
  "blockchain supply chain",
  "computer vision autonomous",
  "sentiment analysis social media",
];

const results = [
  {
    title: "AI-Based Early Detection of Diabetes Using Machine Learning",
    description: "Developing a machine learning model to predict diabetes onset using patient health data and lifestyle factors.",
    tags: ["Artificial Intelligence", "Machine Learning", "Healthcare", "Predictive Analysis"],
    year: "2025",
    authors: "Sarah Johnson, Michael Chen",
  },
  {
    title: "Blockchain-Based Supply Chain Transparency System",
    description: "A decentralized system for tracking and verifying supply chain transactions using blockchain technology.",
    tags: ["Blockchain", "Supply Chain", "Decentralized"],
    year: "2025",
    authors: "Mark Rivera, Anna Cruz",
  },
  {
    title: "Natural Language Processing for Sentiment Analysis in Social Media",
    description: "Using NLP techniques to analyze public sentiment from social media posts in real time.",
    tags: ["Natural Language Processing", "Sentiment Analysis", "Social Media"],
    year: "2024",
    authors: "Luis Reyes, Carla Mendes",
  },
  {
    title: "Computer Vision for Autonomous Vehicle Navigation",
    description: "Implementing object detection and lane recognition for self-driving car systems.",
    tags: ["Computer Vision", "Autonomous", "Deep Learning"],
    year: "2024",
    authors: "James Park, Elena Gomez",
  },
];

export default function CapstoneSearch() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Categorist");

  const filteredResults = results.filter((r) => {
    const matchesQuery =
      query === "" ||
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.description.toLowerCase().includes(query.toLowerCase()) ||
      r.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));

    const matchesCategory =
      activeCategory === "All Categorist" ||
      r.tags.some((t) => t === activeCategory);

    return matchesQuery && matchesCategory;
  });

  return (
    <AppLayout breadcrumbs={[{ label: "Capstone Search", href: "/capstone-search" }]}>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          ✦ Capstone Semantic Search
        </h1>
        <p className="text-sm text-muted-foreground">
          Intelligent, meaning-based searching of capstone project titles using semantic similarity
        </p>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Enter search query eg.( 'machine learning for disease prediction' )"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Example queries */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Try these examples</span>
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => setQuery(ex)}
            className="text-xs text-primary underline-offset-4 hover:underline"
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          ◇ Filter by Category:
        </span>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={activeCategory === cat ? "default" : "outline"}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <TrendingUp className="h-4 w-4" />
        <span>{filteredResults.length} Results found</span>
      </div>

      {/* Results */}
      <div className="flex flex-col gap-3">
        {filteredResults.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            No results found for your search.
          </div>
        ) : (
          filteredResults.map((result, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <BookOpen className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <h3 className="font-semibold text-gray-900">{result.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground pl-7">{result.description}</p>
              <div className="flex flex-wrap gap-2 pl-7">
                {result.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-4 pl-7 text-xs text-muted-foreground">
                <span>📅 {result.year}</span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {result.authors}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

    </AppLayout>
  );
}