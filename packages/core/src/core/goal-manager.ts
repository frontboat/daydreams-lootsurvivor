import type { Goal, GoalStatus, HorizonType } from "../types";

export class GoalManager {
  private goals: Map<string, Goal> = new Map();

  public addGoal(goal: Omit<Goal, "id">): Goal {
    const id = `goal-${Math.random().toString(36).substring(2, 15)}`;
    const newGoal = { ...goal, id, progress: 0 };
    this.goals.set(id, newGoal);

    // If this is a subgoal, update the parent's subgoals array
    if (goal.parentGoal) {
      const parent = this.goals.get(goal.parentGoal);
      if (parent) {
        parent.subgoals = parent.subgoals || [];
        parent.subgoals.push(id);
      }
    }

    return newGoal;
  }

  /**
   * Update the status of a goal. If marking it "completed",
   * also sets completed_at, progress=100, and updates parent/subgoal statuses.
   */
  public updateGoalStatus(id: string, status: GoalStatus): void {
    const goal = this.goals.get(id);
    if (!goal) return;

    goal.status = status;

    if (status === "completed") {
      goal.completed_at = Date.now();
      goal.progress = 100;
      this.updateParentProgress(goal);
      this.checkAndUpdateDependentGoals(id);
    }
  }

  private updateParentProgress(goal: Goal): void {
    if (!goal.parentGoal) return;

    const parent = this.goals.get(goal.parentGoal);
    if (!parent || !parent.subgoals) return;

    // Calculate parent progress based on completed subgoals
    const completedSubgoals = parent.subgoals.filter(
      (subId) => this.goals.get(subId)?.status === "completed"
    ).length;

    parent.progress = Math.round(
      (completedSubgoals / parent.subgoals.length) * 100
    );

    // If all subgoals are complete, mark parent as ready (or completed if you prefer)
    if (parent.progress === 100) {
      parent.status = "ready";
    }
  }

  private checkAndUpdateDependentGoals(completedGoalId: string): void {
    // Find all goals that depend on the completed goal
    Array.from(this.goals.values()).forEach((goal) => {
      if (goal.dependencies?.includes(completedGoalId)) {
        // Check if all dependencies are now completed
        const allDependenciesMet = goal.dependencies.every(
          (depId) => this.goals.get(depId)?.status === "completed"
        );

        if (allDependenciesMet) {
          goal.status = "ready";
        }
      }
    });
  }

  public getGoalsByHorizon(horizon: HorizonType): Goal[] {
    return Array.from(this.goals.values())
      .filter((g) => g.horizon === horizon)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Return "ready" or effectively unlocked goals, optionally filtering by horizon.
   * Also checks if dependencies are completed.
   */
  public getReadyGoals(horizon?: HorizonType): Goal[] {
    return Array.from(this.goals.values())
      .filter((goal) => {
        const horizonMatch = !horizon || goal.horizon === horizon;
        const isReady = goal.status === "ready";
        const dependenciesMet =
          !goal.dependencies?.length ||
          goal.dependencies.every(
            (depId) => this.goals.get(depId)?.status === "completed"
          );
        return horizonMatch && (isReady || dependenciesMet);
      })
      .sort((a, b) => b.priority - a.priority);
  }

  public getGoalHierarchy(goalId: string): Goal[] {
    const goal = this.goals.get(goalId);
    if (!goal) return [];

    const hierarchy: Goal[] = [goal];

    // Get all subgoals recursively
    if (goal.subgoals) {
      goal.subgoals.forEach((subId) => {
        hierarchy.push(...this.getGoalHierarchy(subId));
      });
    }
    return hierarchy;
  }

  public getBlockingGoals(goalId: string): Goal[] {
    const goal = this.goals.get(goalId);
    if (!goal || !goal.dependencies) return [];

    return goal.dependencies
      .map((depId) => this.goals.get(depId))
      .filter(
        (dep): dep is Goal => dep !== undefined && dep.status !== "completed"
      );
  }

  // Single-goal retrieval
  public getGoalById(id: string): Goal | undefined {
    return this.goals.get(id);
  }

  // Retrieve child goals of a parent
  public getChildGoals(parentId: string): Goal[] {
    const parent = this.goals.get(parentId);
    if (!parent || !parent.subgoals) return [];

    return parent.subgoals
      .map((id) => this.goals.get(id))
      .filter((goal): goal is Goal => goal !== undefined);
  }

  // Goals that depend on a given goal
  public getDependentGoals(goalId: string): Goal[] {
    return Array.from(this.goals.values()).filter((goal) =>
      goal.dependencies?.includes(goalId)
    );
  }

  // Check if a goal's dependencies are all met
  public arePrerequisitesMet(goalId: string): boolean {
    const goal = this.goals.get(goalId);
    if (!goal || !goal.dependencies) return true;

    return goal.dependencies.every((depId) => {
      const dep = this.goals.get(depId);
      return dep?.status === "completed";
    });
  }

  // Update goal progress (0-100)
  public updateGoalProgress(id: string, progress: number): void {
    const goal = this.goals.get(id);
    if (!goal) return;

    goal.progress = Math.min(100, Math.max(0, progress));

    // If progress is 100%, mark as ready (or completed if you prefer)
    if (goal.progress === 100 && goal.status !== "completed") {
      goal.status = "ready";
    }

    // Update parent progress if this is a subgoal
    if (goal.parentGoal) {
      this.updateParentProgress(this.goals.get(goal.parentGoal)!);
    }
  }

  // Retrieve all goals in a given status
  public getGoalsByStatus(status: GoalStatus): Goal[] {
    return Array.from(this.goals.values())
      .filter((goal) => goal.status === status)
      .sort((a, b) => b.priority - a.priority);
  }

  // Check if a goal can be refined (example logic)
  public canBeRefined(goalId: string): boolean {
    const goal = this.goals.get(goalId);
    if (!goal) return false;

    // Example conditions for refinement
    return (
      goal.horizon !== "short" &&
      (!goal.subgoals || goal.subgoals.length === 0) &&
      !["completed", "failed"].includes(goal.status)
    );
  }

  // Block a goal (and subgoals) recursively
  public blockGoalHierarchy(goalId: string, reason: string): void {
    const goal = this.goals.get(goalId);
    if (!goal) return;

    goal.status = "blocked";
    goal.meta = { ...goal.meta, blockReason: reason };

    // Block all subgoals recursively
    if (goal.subgoals) {
      goal.subgoals.forEach((subId) => {
        this.blockGoalHierarchy(
          subId,
          `Parent goal ${goalId} is blocked: ${reason}`
        );
      });
    }
  }

  // Get full path from root to this goal
  public getGoalPath(goalId: string): Goal[] {
    const path: Goal[] = [];
    let currentGoal = this.goals.get(goalId);

    while (currentGoal) {
      path.unshift(currentGoal);
      if (!currentGoal.parentGoal) break;
      currentGoal = this.goals.get(currentGoal.parentGoal);
    }
    return path;
  }

  // Rough estimate of completion time based on horizon + dependencies
  public estimateCompletionTime(goalId: string): number {
    const goal = this.goals.get(goalId);
    if (!goal) return 0;

    // Base time for the goal itself (you can adjust these weights)
    const baseTime =
      {
        short: 1,
        medium: 3,
        long: 8,
      }[goal.horizon] || 1;

    // Add time for incomplete dependencies
    const dependencyTime = (goal.dependencies || [])
      .map((depId) => {
        const dep = this.goals.get(depId);
        return dep && dep.status !== "completed"
          ? this.estimateCompletionTime(depId)
          : 0;
      })
      .reduce((sum, time) => sum + time, 0);

    // Add time for incomplete subgoals
    const subgoalTime = (goal.subgoals || [])
      .map((subId) => {
        const sub = this.goals.get(subId);
        return sub && sub.status !== "completed"
          ? this.estimateCompletionTime(subId)
          : 0;
      })
      .reduce((sum, time) => sum + time, 0);

    return baseTime + Math.max(dependencyTime, subgoalTime);
  }

  /**
   * Record an outcome score for a goal, along with optional commentary.
   * You can define your own scale. E.g. 0 = fail, >0 = success, or 1-100, etc.
   */
  public recordGoalOutcome(
    goalId: string,
    outcomeScore: number,
    comment?: string
  ): void {
    const goal = this.goals.get(goalId);
    if (!goal) return;

    // Mark as completed if not already
    if (goal.status !== "completed" && goal.status !== "failed") {
      this.updateGoalStatus(goalId, "completed");
    }

    // Attach or update the outcomeScore
    goal.outcomeScore = outcomeScore;

    // Track score history if you want multiple attempts or runs
    goal.scoreHistory = goal.scoreHistory || [];
    goal.scoreHistory.push({
      timestamp: Date.now(),
      score: outcomeScore,
      comment,
    });
  }

  public recordGoalFailure(
    goalId: string,
    reason: string,
    outcomeScore: number = 0
  ): void {
    const goal = this.goals.get(goalId);
    if (!goal) return;

    goal.status = "failed";
    goal.completed_at = Date.now();
    goal.progress = 100; // or leave as-is

    // Indicate or store the failing reason
    goal.meta = { ...goal.meta, failReason: reason };

    // Track the failure score
    goal.outcomeScore = outcomeScore;
    goal.scoreHistory = goal.scoreHistory || [];
    goal.scoreHistory.push({
      timestamp: Date.now(),
      score: outcomeScore,
      comment: `Failed: ${reason}`,
    });
  }

  /**
   * Return goals sorted by best outcomeScore so you can see "top performing" or "most successful" goals.
   */
  public getGoalsByScore(): Goal[] {
    return Array.from(this.goals.values())
      .filter((g) => g.outcomeScore !== undefined)
      .sort((a, b) => (b.outcomeScore || 0) - (a.outcomeScore || 0));
  }
}
