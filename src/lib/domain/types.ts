export interface SetLike {
  weight: number;
  repetitions: number;
  completed?: boolean;
}

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DatedValue {
  date: string; // YYYY-MM-DD
  value: number;
}
