"use client";

import { useState, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  [key: string]: unknown;  // FIX: line 11 — replaced `any` with `unknown`
}

interface UniversalSearchProps<T extends SearchResult> {
  searchFunction: (term: string) => Promise<T[]>;
  onSelect: (item: T) => void;
  placeholder?: string;
  displayKeys: (keyof T)[];
  renderResult?: (item: T) => React.ReactNode;
  minChars?: number;
  debounceMs?: number;
  disabled?: boolean;
  clearOnSelect?: boolean;
  label?: string;
  required?: boolean;
}

export function UniversalSearch<T extends SearchResult>({
  searchFunction,
  onSelect,
  placeholder = "Search...",
  displayKeys,
  renderResult,
  minChars = 2,
  debounceMs = 300,
  disabled = false,
  clearOnSelect = false,
  label,
  required = false,
}: UniversalSearchProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Debounced search
  useEffect(() => {
    if (searchTerm.length < minChars) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchFunction(searchTerm);
        setResults(data);
        setShowResults(true);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, searchFunction, minChars, debounceMs]);

  const handleSelect = (item: T) => {
    onSelect(item);
    if (clearOnSelect) {
      setSearchTerm("");
    }
    setShowResults(false);
  };

  const handleClear = () => {
    setSearchTerm("");
    setResults([]);
    setShowResults(false);
  };

  const defaultRender = (item: T) => {
    return (
      <div className="flex flex-col">
        {displayKeys.map((key) => (
          <span
            key={String(key)}
            className={cn(
              "text-sm",
              displayKeys[0] === key ? "font-medium" : "text-muted-foreground"
            )}
          >
            {String(item[key])}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="relative w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled}
          className="pr-20"
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          
          {searchTerm && !isLoading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full px-3 py-2 text-left hover:bg-muted transition-colors border-b last:border-b-0"
            >
              {renderResult ? renderResult(item) : defaultRender(item)}
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {showResults && !isLoading && results.length === 0 && searchTerm.length >= minChars && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg p-3">
          <p className="text-sm text-muted-foreground text-center">
            {/* FIX: lines 161 — escaped unescaped quotes */}
            No results found for &quot;{searchTerm}&quot;
          </p>
        </div>
      )}
    </div>
  );
}