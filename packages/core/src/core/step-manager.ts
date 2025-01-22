// Add new step types at the top

import type { Step, StepType } from "../types";

// Add StepManager class
class StepManager {
  private steps: Step[] = [];
  private stepIds: Set<string> = new Set();

  constructor() {
    this.steps = [];
    this.stepIds = new Set();
  }

  public addStep(step: Step): Step {
    if (this.stepIds.has(step.id)) {
      throw new Error(`Step with ID ${step.id} already exists`);
    }

    this.steps.push(step);
    this.stepIds.add(step.id);
    return step;
  }

  public getSteps(): Step[] {
    return this.steps;
  }

  public getStepById(id: string): Step | undefined {
    return this.steps.find((s) => s.id === id);
  }

  public updateStep(id: string, updates: Partial<Step>): void {
    const index = this.steps.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error(`Step with ID ${id} not found`);
    }

    const currentStep = this.steps[index];
    const updatedStep = {
      ...currentStep,
      ...updates,
      type: currentStep.type, // Preserve the original step type
      timestamp: Date.now(), // Update timestamp on changes
    } as Step;

    this.steps[index] = updatedStep;
  }

  public removeStep(id: string): void {
    const index = this.steps.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error(`Step with ID ${id} not found`);
    }

    this.steps.splice(index, 1);
    this.stepIds.delete(id);
  }

  public clear(): void {
    this.steps = [];
    this.stepIds.clear();
  }
}

export { StepManager, type Step, type StepType };
