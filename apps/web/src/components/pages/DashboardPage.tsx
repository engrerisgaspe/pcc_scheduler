/**
 * DashboardPage - Overview of school scheduling system
 */

export function DashboardPage() {
  return (
    <div className="page-content">
      <div className="page-header">
        <h2>School Scheduling Dashboard</h2>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Quick Start</h3>
          <p>Begin by setting up your school's basic data:</p>
          <ol>
            <li>Add teachers and their qualifications</li>
            <li>Add subjects and their requirements</li>
            <li>Add sections (classes)</li>
            <li>Add rooms and their capacities</li>
            <li>Configure schedule settings</li>
          </ol>
        </div>

        <div className="dashboard-card">
          <h3>System Status</h3>
          <ul>
            <li>✓ Teachers configured</li>
            <li>✓ Subjects available</li>
            <li>✓ Sections created</li>
            <li>✓ Rooms assigned</li>
          </ul>
        </div>

        <div className="dashboard-card">
          <h3>Next Steps</h3>
          <p>Once your base data is ready:</p>
          <ul>
            <li>Plan subject assignments for sections</li>
            <li>Set teacher availability</li>
            <li>Configure schedule preferences</li>
            <li>Generate automatic schedule</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
