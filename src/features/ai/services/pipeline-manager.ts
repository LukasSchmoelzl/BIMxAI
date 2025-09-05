export class PipelineManager {
  private pipelines = new Map<string, any>();
  
  register(name: string, pipeline: any) {
    this.pipelines.set(name, pipeline);
  }
  
  getPipeline(name: string) {
    return this.pipelines.get(name);
  }
  
  hasPipeline(name: string): boolean {
    return this.pipelines.has(name);
  }
  
  listPipelines(): string[] {
    return Array.from(this.pipelines.keys());
  }
  
  removePipeline(name: string): boolean {
    return this.pipelines.delete(name);
  }
  
  clear() {
    this.pipelines.clear();
  }
} 