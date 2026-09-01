/** One point in a monthly count progression. */
export interface IMonthlyCount {
  month: string; // "2026-09"
  count: number; // accounts created in that month
  cumulative: number; // running total to the end of that month
}

export interface IFarmerStats {
  total: number;
  active: number;
  /** Farmers who own at least one active field. */
  fieldIntegrated: number;
  monthly: IMonthlyCount[];
}

export interface IExpertStats {
  total: number;
  active: number;
  /** Experts carrying at least one designation, whatever its state. */
  designated: number;
  pendingDesignations: number;
  approvedDesignations: number;
  rejectedDesignations: number;
  monthly: IMonthlyCount[];
}

export interface IFieldStats {
  total: number;
  active: number;
}

export interface IAdvisoryStats {
  total: number;
  active: number;
  /** Resolved without a human ever being assigned. */
  aiHandled: number;
  /** Reached a human expert at any point. */
  expertNeeded: number;
}

export interface IForumStats {
  posts: number;
  contributors: number;
  comments: number;
  /** Likes and dislikes together — every recorded reaction. */
  impressions: number;
}

export interface IAdminOverview {
  farmers: IFarmerStats;
  experts: IExpertStats;
  fields: IFieldStats;
  advisories: IAdvisoryStats;
  forum: IForumStats;
}
