
export interface Report {
  id: string;
  targetId: string; // ID of the review, message, or user
  targetType: 'review' | 'message' | 'user' | 'image';
  reporterId: string;
  reason: string;
  contentSnippet?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
}

const BANNED_WORDS = ['arnaque', 'merde', 'connard', 'idiot', 'scam', 'fake', 'vol', 'tueur', 'haine'];

const STORAGE_KEY_REPORTS = 'eveneo_reports';
const STORAGE_KEY_LOGS = 'eveneo_audit_logs';

export const moderationService = {
  // 12. Modération: Filtrage texte
  checkContent(text: string): { valid: boolean; flaggedWords: string[] } {
    const lowerText = text.toLowerCase();
    const found = BANNED_WORDS.filter(word => lowerText.includes(word));
    return {
      valid: found.length === 0,
      flaggedWords: found
    };
  },

  // 12. Modération: Système de signalement avec Auto-Block
  reportContent(report: Omit<Report, 'id' | 'status' | 'timestamp'>): void {
    const newReport: Report = {
      ...report,
      id: `rep-${Date.now()}`,
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    
    const reports = this.getReports();
    const updatedReports = [newReport, ...reports];
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(updatedReports));
    this.logAction('System', `New report created: ${report.targetType} ${report.targetId}`);

    // Check for Auto-Block Logic: If user reported > 10 times in 30 days
    if (report.targetType === 'user') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const userReports = updatedReports.filter(r => 
            r.targetId === report.targetId && 
            r.targetType === 'user' &&
            new Date(r.timestamp) > thirtyDaysAgo
        );

        if (userReports.length >= 10) {
            this.autoBanUser(report.targetId);
        }
    }
  },

  autoBanUser(userId: string) {
      // Mocking DB update in local storage for users
      // In a real app, this would be an API call
      this.logAction('System', `AUTO-BAN triggered for user ${userId} due to 10+ reports.`);
      
      // Set a flag in local storage that AdminUsers.tsx or Login might check
      localStorage.setItem(`user_banned_${userId}`, 'true');
      
      // Also create a system alert notification
      const reports = this.getReports();
      // Optional: Alert Admin
      console.warn(`User ${userId} has been automatically banned.`);
  },

  getReports(): Report[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_REPORTS) || '[]');
  },

  resolveReport(reportId: string, action: 'dismiss' | 'delete_content' | 'ban_user', adminId: string) {
    const reports = this.getReports();
    const updated = reports.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r);
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(updated));
    
    this.logAction(adminId, `Resolved report ${reportId} with action: ${action}`);
  },

  // 12. Modération: Logs d'actions
  logAction(actor: string, action: string) {
    const log = {
      timestamp: new Date().toISOString(),
      actor,
      action
    };
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY_LOGS) || '[]');
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify([log, ...logs]));
    console.log(`[Audit Log] ${actor}: ${action}`);
  }
};
