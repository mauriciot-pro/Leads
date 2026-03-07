document.addEventListener('DOMContentLoaded', () => {

    // Elements
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');
    const leadForm = document.getElementById('lead-form');
    const submitBtn = document.getElementById('submit-btn');
    const submitSpinner = document.getElementById('submit-spinner');

    // Toast Elements
    const toast = document.getElementById('toast-container');
    const toastMsg = document.getElementById('toast-message');
    const toastClose = document.getElementById('toast-close');

    // Navigation Logic
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Update active state on nav
            navItems.forEach(nav => nav.classList.remove('active'));
            if (!item.classList.contains('action-btn')) {
                item.classList.add('active');
            }

            // Show corresponding view
            const viewId = item.getAttribute('data-view');
            viewSections.forEach(section => {
                section.classList.add('hidden');
                section.classList.remove('active');
            });

            const activeView = document.getElementById(`view-${viewId}`);
            activeView.classList.remove('hidden');
            // Small timeout to allow display:block to apply before animating opacity
            setTimeout(() => activeView.classList.add('active'), 10);

            if (viewId === 'dashboard') {
                fetchLeads();
            }
        });
    });

    // Form Submission Logic
    leadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // UI Loading State
        submitBtn.disabled = true;
        submitSpinner.classList.remove('hidden');
        submitBtn.querySelector('span').textContent = 'Registering...';

        const payload = {
            full_name: document.getElementById('full_name').value.trim(),
            reported_by: document.getElementById('reported_by').value,
            reported_by: document.getElementById('reported_by').value,
            comments: document.getElementById('comments').value.trim()
        };

        try {
            const response = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.status === 409 && data.conflict) {
                // Duplicate Conflict!
                const conflictType = data.conflict.type || "Phone Number";
                showToast(`Conflict (${conflictType}): This lead was already registered by ${data.conflict.agent} on ${data.conflict.date}.`);
            } else if (response.ok) {
                // Success
                leadForm.reset();
                showToast(`Success: Lead ${payload.full_name} registered successfully.`, false);
                // Navigate back to dashboard automatically
                document.querySelector('[data-view="dashboard"]').click();
            } else {
                showToast(`Error: ${data.error || 'Failed to submit.'}`);
            }
        } catch (error) {
            console.error("Submission Error:", error);
            showToast("Networking error occurred. Please try again.");
        } finally {
            // Restore UI
            submitBtn.disabled = false;
            submitSpinner.classList.add('hidden');
            submitBtn.querySelector('span').textContent = 'Register Lead';
        }
    });

    // Toast Logic
    function showToast(message, isError = true) {
        toastMsg.textContent = message;
        toast.style.borderColor = isError ? 'var(--color-accent)' : 'var(--status-new)';
        toast.querySelector('.toast-icon').style.color = isError ? 'var(--color-accent)' : 'var(--status-new)';

        toast.classList.remove('hidden');

        // Auto hide after 5 seconds
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 5000);
    }

    toastClose.addEventListener('click', () => {
        toast.classList.add('hidden');
    });

    // Initialize Dashboard
    fetchLeads();
});

// Fetch and Render Leads
async function fetchLeads() {
    const container = document.getElementById('leads-container');
    // Show skeletons while loading
    container.innerHTML = `
        <div class="glass-card skeleton-card"></div>
        <div class="glass-card skeleton-card"></div>
        <div class="glass-card skeleton-card"></div>
    `;

    try {
        const response = await fetch('/api/leads');
        const leads = await response.json();

        container.innerHTML = '';

        if (leads.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--color-secondary);">No modern leads found yet.</p>';
            return;
        }

        const template = document.getElementById('lead-card-template');

        leads.forEach(lead => {
            const clone = Array.from(template.content.cloneNode(true).children)[0];

            clone.querySelector('.lead-name').textContent = lead.full_name;
            // Phone number has been removed from design 
            // clone.querySelector('.lead-phone').textContent = lead.phone_number;
            clone.querySelector('.lead-date').textContent = lead.report_date;
            clone.querySelector('.lead-agent').textContent = lead.reported_by;

            if (lead.comments) {
                clone.querySelector('.lead-comments').textContent = `"${lead.comments}"`;
            } else {
                clone.querySelector('.lead-comments').remove();
            }

            // Status Badge coloring
            const badge = clone.querySelector('.status-badge');
            badge.textContent = lead.status_update;

            // Map status text to classes
            let statusClass = 'status-new';
            if (lead.status_update.includes('Progress')) statusClass = 'status-progress';
            if (lead.status_update.includes('Showing')) statusClass = 'status-showing';
            if (lead.status_update.includes('Sold')) statusClass = 'status-sold';
            if (lead.status_update.includes('Lost')) statusClass = 'status-lost';
            badge.classList.add(statusClass);

            // Set select value
            const select = clone.querySelector('.status-updater');
            select.value = lead.status_update;

            // Handle status change
            select.addEventListener('change', async (e) => {
                const newStatus = e.target.value;
                try {
                    select.disabled = true;
                    await fetch(`/api/leads/${lead.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus })
                    });

                    // Update badge visually immediately
                    badge.textContent = newStatus;
                    badge.className = 'status-badge'; // reset

                    let newClass = 'status-new';
                    if (newStatus.includes('Progress')) newClass = 'status-progress';
                    if (newStatus.includes('Showing')) newClass = 'status-showing';
                    if (newStatus.includes('Sold')) newClass = 'status-sold';
                    if (newStatus.includes('Lost')) newClass = 'status-lost';
                    badge.classList.add(newClass);

                } catch (error) {
                    console.error("Update failed", error);
                } finally {
                    select.disabled = false;
                }
            });

            container.appendChild(clone);
        });

    } catch (error) {
        console.error("Error fetching leads:", error);
        container.innerHTML = '<p style="grid-column: 1/-1; color: var(--color-accent);">Error loading data from Google Sheets.</p>';
    }
}
