export class LevelSystem {
  level = 1;
  experience = 0;
  requiredExperience = this.calculateRequiredExperience(1);

  addExperience(amount: number): boolean {
    this.experience += amount;
    if (this.experience < this.requiredExperience) {
      return false;
    }

    this.experience -= this.requiredExperience;
    this.level += 1;
    this.requiredExperience = this.calculateRequiredExperience(this.level);
    return true;
  }

  private calculateRequiredExperience(level: number): number {
    return Math.floor(10 * Math.pow(1.25, level - 1));
  }
}
