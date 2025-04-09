// lib/categories.ts
// Static categories for fallback

export interface Category {
    id: string;
    name: string;
    color: string;
    icon: string;
  }
  
  export const staticCategories: Category[] = [
    { id: 'food-dining', name: 'Food & Dining', color: '#FF5722', icon: 'restaurant' },
    { id: 'transportation', name: 'Transportation', color: '#2196F3', icon: 'car' },
    { id: 'housing', name: 'Housing', color: '#4CAF50', icon: 'home' },
    { id: 'utilities', name: 'Utilities', color: '#FFC107', icon: 'bolt' },
    { id: 'entertainment', name: 'Entertainment', color: '#9C27B0', icon: 'movie' },
    { id: 'shopping', name: 'Shopping', color: '#E91E63', icon: 'shopping-bag' },
    { id: 'healthcare', name: 'Healthcare', color: '#00BCD4', icon: 'medical-services' },
    { id: 'personal', name: 'Personal', color: '#795548', icon: 'person' },
    { id: 'education', name: 'Education', color: '#3F51B5', icon: 'school' },
    { id: 'other', name: 'Other', color: '#607D8B', icon: 'more-horiz' }
  ];