import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

interface TitleIdMapping {
  [titleId: string]: string;
}

class TitleIdManager {
  private otherTitleIds: TitleIdMapping = {};
  private filePath: string;
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.filePath = "/data/ryuldn/otherTitleIds.txt";
    
    if (!existsSync(this.filePath)) {
      mkdirSync("/data/ryuldn", { recursive: true });
      writeFileSync(this.filePath, "", "utf8");
    }
    
    this.loadTitleIds();
    this.startRefreshInterval();
  }

  private loadTitleIds(): void {
    try {
      if (existsSync(this.filePath)) {
        const content = readFileSync(this.filePath, "utf8");
        const lines = content.split("\n").filter(line => line.trim() !== "");
        
        this.otherTitleIds = {};
        for (const line of lines) {
          const [titleId, name] = line.split("=", 2);
          if (titleId && name) {
            this.otherTitleIds[titleId.trim()] = name.trim();
          }
        }
      }
    } catch (error) {
      console.error("Failed to load title ID mappings:", error);
    }
  }

  private saveTitleIds(): void {
    try {
      const lines = Object.entries(this.otherTitleIds)
        .map(([titleId, name]) => `${titleId}=${name}`)
        .sort();
      
      writeFileSync(this.filePath, lines.join("\n") + "\n", "utf8");
      console.log("Saved title ID mappings to file");
    } catch (error) {
      console.error("Failed to save title ID mappings:", error);
    }
  }

  private startRefreshInterval(): void {
    this.refreshInterval = setInterval(() => {
      this.loadTitleIds();
    }, 10000);
  }

  public addUnknownTitleId(titleId: string): void {
    const normalizedTitleId = titleId.toLowerCase();
    
    if (!this.otherTitleIds[normalizedTitleId]) {
      this.otherTitleIds[normalizedTitleId] = "Unknown";
      this.saveTitleIds();
      console.log(`Added unknown title ID: ${titleId}`);
    }
  }

  public getTitleName(titleId: string): string | null {
    const normalizedTitleId = titleId.toLowerCase();
    return this.otherTitleIds[normalizedTitleId] || null;
  }

  public getAllMappings(): TitleIdMapping {
    return { ...this.otherTitleIds };
  }

  public stop(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

export const titleIdManager = new TitleIdManager(); 