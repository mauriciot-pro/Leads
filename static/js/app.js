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
            item.classList.add('active');

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
            first_name: document.getElementById('first_name').value.trim(),
            last_name: document.getElementById('last_name').value.trim(),
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
                showToast(`Conflict (${payload.full_name}): This lead was already registered by ${data.conflict.agent} on ${data.conflict.date}.`);
            } else if (response.ok) {
                // Success
                leadForm.reset();
                showToast(`Success: Lead registered successfully.`, false);
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

// Global State for filtering
let allLeadsData = [];

// Fetch and Render Leads
async function fetchLeads() {
    const dashboardContainer = document.getElementById('dashboard-leads-container');
    const allLeadsContainer = document.getElementById('all-leads-container');
    
    // Show skeletons while loading
    if(dashboardContainer) {
        dashboardContainer.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading...</td></tr>';
    }
    
    if(allLeadsContainer) {
        allLeadsContainer.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading...</td></tr>';
    }

    try {
        const response = await fetch('/api/leads');
        allLeadsData = await response.json(); // Store for client-side filtering

        renderLeads(allLeadsData, dashboardContainer, allLeadsContainer);

    } catch (error) {
        console.error("Error fetching leads:", error);
        if(dashboardContainer) dashboardContainer.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--color-accent);">Error loading data from Google Sheets.</td></tr>';
        if(allLeadsContainer) allLeadsContainer.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--color-accent);">Error loading data from Google Sheets.</td></tr>';
    }
}

function renderLeads(leads, dashboardContainer, allLeadsContainer) {
    if(allLeadsContainer) allLeadsContainer.innerHTML = '';
    
    const rowTemplate = document.getElementById('lead-row-template');

    // Extract unique year-months and agents
    const uniqueMonthsMap = new Map();
    const uniqueAgents = new Set();
    leads.forEach(lead => {
        if(lead.report_date && lead.report_date !== "Unknown Date") {
            const d = new Date(lead.report_date);
            if (!isNaN(d.getTime())) {
                const year = d.getFullYear();
                const month = d.getMonth() + 1;
                const monthName = d.toLocaleString('default', { month: 'long' });
                const key = `${year}-${month.toString().padStart(2, '0')}`;
                if (!uniqueMonthsMap.has(key)) {
                    uniqueMonthsMap.set(key, { year: year, monthName: monthName, key: key });
                }
            }
        }
        if(lead.reported_by) {
            uniqueAgents.add(lead.reported_by);
        }
    });

    // Populate month dropdown
    const filterMonth = document.getElementById('filter-month');
    if (filterMonth) {
        filterMonth.innerHTML = '<option value="all">All Months</option>';
        
        const sortedKeys = Array.from(uniqueMonthsMap.keys()).sort().reverse();
        let currentYear = null;
        let optGroup = null;
        
        sortedKeys.forEach(key => {
            const data = uniqueMonthsMap.get(key);
            if (data.year !== currentYear) {
                if (optGroup) filterMonth.appendChild(optGroup);
                currentYear = data.year;
                optGroup = document.createElement('optgroup');
                optGroup.label = currentYear;
            }
            const option = document.createElement('option');
            option.value = key;
            option.textContent = data.monthName;
            optGroup.appendChild(option);
        });
        if (optGroup) filterMonth.appendChild(optGroup);
        
        filterMonth.innerHTML += `<option value="Unknown Date">Unknown Date</option>`;
    }

    // Populate agent dropdown (Custom Multi-select)
    const agentOptionsContainer = document.getElementById('agent-options-container');
    if (agentOptionsContainer) {
        agentOptionsContainer.innerHTML = '';
        
        // Add specific "All Agents" option (handled differently in logic)
        const allOptionHTML = `
            <div class="custom-select-option">
                <input type="checkbox" id="agent-opt-all" value="all" checked>
                <label for="agent-opt-all">All Agents</label>
            </div>
        `;
        agentOptionsContainer.innerHTML += allOptionHTML;

        [...uniqueAgents].sort().forEach(agent => {
            if(agent) {
                const safeAgentId = agent.replace(/\s+/g, '-').toLowerCase();
                const optHTML = `
                    <div class="custom-select-option agent-option-item">
                        <input type="checkbox" id="agent-opt-${safeAgentId}" value="${agent}" class="agent-checkbox">
                        <label for="agent-opt-${safeAgentId}">${agent}</label>
                    </div>
                `;
                agentOptionsContainer.innerHTML += optHTML;
            }
        });
        
        setupCustomSelectLogic();
    }
    
    // Calculate and render Dashboard Stats
    updateSalesOverview(leads, 'all', []);

    // Render All Leads View
    if (allLeadsContainer) {
        if (leads.length === 0) {
            allLeadsContainer.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-secondary);">No leads found.</td></tr>';
        } else {
            leads.forEach(lead => {
                const row = createCardFromTemplate(rowTemplate, lead);
                row.classList.add('all-leads-card'); // Tag for filtering
                
                // For raw datasets, merge legacy First/Last names if Full Name is blank
                let displayName = lead.full_name;
                if(!displayName && (lead.first_name || lead.last_name)) {
                    displayName = `${lead.first_name} ${lead.last_name}`.trim();
                }
                
                
                row.dataset.firstname = (lead.first_name || '').toLowerCase();
                row.dataset.lastname = (lead.last_name || '').toLowerCase();
                row.dataset.agent = (lead.reported_by || '').toLowerCase();
                row.dataset.date = (lead.report_date || '').toLowerCase();
                row.dataset.status = (lead.status_update || '').toLowerCase();
                
                allLeadsContainer.appendChild(row);
            });
        }
    }
}

function createCardFromTemplate(template, lead) {
    const clone = Array.from(template.content.cloneNode(true).children)[0];

    let fName = lead.first_name || lead.full_name || 'Unknown';
    let lName = lead.last_name || '';
    
    // We try to split Full Name if First/Last wasn't provided but Full was (legacy parsing fallback)
    if(!lead.first_name && !lead.last_name && lead.full_name) {
       const parts = lead.full_name.split(' ');
       fName = parts[0];
       lName = parts.slice(1).join(' ');
    }
    
    const fNode = clone.querySelector('.lead-firstname');
    if (fNode) fNode.textContent = fName;
    
    const lNode = clone.querySelector('.lead-lastname');
    if (lNode) lNode.textContent = lName;
    
    const nNode = clone.querySelector('.lead-name');
    if (nNode) {
        let displayName = lead.full_name;
        if(!displayName && (lead.first_name || lead.last_name)) {
            displayName = `${lead.first_name} ${lead.last_name}`.trim();
        }
        nNode.textContent = displayName || 'Unknown Client';
    }
    
    clone.querySelector('.lead-date').textContent = lead.report_date || 'Unknown Date';
    clone.querySelector('.lead-agent').textContent = lead.reported_by || 'Unknown Agent';

    if (lead.comments) {
        clone.querySelector('.lead-comments').textContent = lead.comments;
    } else {
        clone.querySelector('.lead-comments').textContent = "-";
    }

    // Status Badge coloring
    const badge = clone.querySelector('.status-badge');
    badge.textContent = lead.status_update;

    // Map status text to classes
    let statusClass = 'status-new';
    if (lead.status_update.includes('Progress')) statusClass = 'status-progress';
    if (lead.status_update.includes('Showing')) statusClass = 'status-showing';
    if (lead.status_update.includes('Reserved')) statusClass = 'status-reserved';
    if (lead.status_update.includes('Sold')) statusClass = 'status-sold';
    if (lead.status_update.includes('Legacy') || lead.status_update.includes('Imported')) statusClass = 'status-legacy';
    else if (lead.status_update.includes('Lost')) statusClass = 'status-lost';
    
    badge.classList.add(statusClass);

    // Set select value
    const select = clone.querySelector('.status-updater');
    
    // Add Legacy option if it's currently a legacy string
    if(!Array.from(select.options).some(opt => opt.value === lead.status_update)) {
         const newOpt = new Option(lead.status_update, lead.status_update);
         select.add(newOpt);
    }
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
            if (newStatus.includes('Reserved')) newClass = 'status-reserved';
            if (newStatus.includes('Sold')) newClass = 'status-sold';
            if (newStatus.includes('Lost')) newClass = 'status-lost';
            if (newStatus.includes('Legacy') || newStatus.includes('Imported')) newClass = 'status-legacy';
            badge.classList.add(newClass);
            
            // Update the data attribute for filtering
            clone.dataset.status = newStatus.toLowerCase();

        } catch (error) {
            console.error("Update failed", error);
        } finally {
            select.disabled = false;
        }
    });

    // Disable updates for legacy rows without strict IDs 
    if(lead.is_legacy) {
         select.disabled = true;
         select.title = "Cannot update status of legacy records from this application.";
    }

    return clone;
}


function updateSalesOverview(leads, selectedMonth, selectedAgents) {
    let filteredLeads = leads;
    
    // Filter by month
    if (selectedMonth !== 'all') {
        filteredLeads = filteredLeads.filter(lead => {
            if (selectedMonth === 'Unknown Date') {
                const d = new Date(lead.report_date);
                return !lead.report_date || isNaN(d.getTime());
            }
            const d = new Date(lead.report_date);
            if (isNaN(d.getTime())) return false;
            const year = d.getFullYear();
            const month = d.getMonth() + 1;
            const key = `${year}-${month.toString().padStart(2, '0')}`;
            return key === selectedMonth;
        });
    }

    // Filter by agents (Array)
    if (selectedAgents && selectedAgents.length > 0) {
        // If "all" is not the only thing selected or logic prevents empty array, we filter.
        // Actually, if selectedAgents has items, we filter using includes.
        
        const lowerSelectedAgents = selectedAgents.map(a => a.toLowerCase());
        
        filteredLeads = filteredLeads.filter(lead => {
            const leadAgent = (lead.reported_by || '').toLowerCase();
            return lowerSelectedAgents.includes(leadAgent);
        });
    }

    // Calculate Stats
    let totalLeads = filteredLeads.length;
    let totalReserved = 0;
    let totalSold = 0;
    
    const agentCounts = {};

    filteredLeads.forEach(lead => {
        // Status counts
        const status = (lead.status_update || '').toLowerCase();
        if (status.includes('reserve')) {
            totalReserved++;
        }
        if (status.includes('sold')) {
            totalSold++;
        }
    });

    // Update DOM for Stats
    const statTotalEl = document.getElementById('stat-total-leads');
    const statReservedEl = document.getElementById('stat-total-reserved');
    const statSoldEl = document.getElementById('stat-total-sold');
    
    if (statTotalEl) statTotalEl.textContent = totalLeads;
    if (statReservedEl) statReservedEl.textContent = totalReserved;
    if (statSoldEl) statSoldEl.textContent = totalSold;

    // Remove leaderboard rendering logic per user request
}


// Client-Side Filtration Logic
document.addEventListener('DOMContentLoaded', () => {
    // All Leads filters
    const filterFirstName = document.getElementById('filter-firstname');
    const filterLastName = document.getElementById('filter-lastname');
    const filterAgent = document.getElementById('filter-agent');
    const filterDate = document.getElementById('filter-date');
    
    // Dashboard filters
    const filterMonth = document.getElementById('filter-month');
    
    // Custom select elements
    const agentSelectHeader = document.getElementById('agent-select-header');
    const agentSelectDropdown = document.getElementById('agent-select-dropdown');
    const agentSearchInput = document.getElementById('agent-search-input');
    const agentSelectText = document.getElementById('agent-select-text');

    function applyAllLeadsFilters() {
        const qFirstName = filterFirstName ? filterFirstName.value.toLowerCase().trim() : '';
        const qLastName = filterLastName ? filterLastName.value.toLowerCase().trim() : '';
        const qAgent = filterAgent ? filterAgent.value.toLowerCase().trim() : '';
        const qDate = filterDate ? filterDate.value.toLowerCase().trim() : '';

        const cards = document.querySelectorAll('.all-leads-card');
        
        cards.forEach(card => {
            const cardFirstName = card.dataset.firstname || '';
            const cardLastName = card.dataset.lastname || '';
            const cardAgent = card.dataset.agent || '';
            const cardDate = card.dataset.date || '';
            
            const matchFirstName = !qFirstName || cardFirstName.includes(qFirstName);
            const matchLastName = !qLastName || cardLastName.includes(qLastName);
            const matchAgent = !qAgent || cardAgent.includes(qAgent);
            const matchDate = !qDate || cardDate.includes(qDate);
            
            if (matchFirstName && matchLastName && matchAgent && matchDate) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    function applyDashboardFilters() {
        const qMonth = filterMonth ? filterMonth.value : 'all';
        
        // Gather checked agents
        const checkedAgentBoxes = document.querySelectorAll('.agent-checkbox:checked');
        let selectedAgents = [];
        
        const allAgentsBox = document.getElementById('agent-opt-all');
        if (allAgentsBox && allAgentsBox.checked) {
            // Leave array empty to signify "All", updateSalesOverview handles empty array as no filter
            // Or we check the logic. The logic above says if selectedAgents.length > 0 it filters.
            // So if 'all' is checked, we pass an empty array to NOT filter by agent.
            selectedAgents = [];
        } else {
             checkedAgentBoxes.forEach(box => selectedAgents.push(box.value));
        }

        updateSalesOverview(allLeadsData, qMonth, selectedAgents);
    }

    if(filterFirstName) filterFirstName.addEventListener('input', applyAllLeadsFilters);
    if(filterLastName) filterLastName.addEventListener('input', applyAllLeadsFilters);
    if(filterAgent) filterAgent.addEventListener('input', applyAllLeadsFilters);
    if(filterDate) filterDate.addEventListener('input', applyAllLeadsFilters);
    
    if(filterMonth) filterMonth.addEventListener('change', applyDashboardFilters);
    
});

function setupCustomSelectLogic() {
    const header = document.getElementById('agent-select-header');
    const dropdown = document.getElementById('agent-select-dropdown');
    const searchInput = document.getElementById('agent-search-input');
    const allAgentsBox = document.getElementById('agent-opt-all');
    const agentCheckboxes = document.querySelectorAll('.agent-checkbox');
    const textLabel = document.getElementById('agent-select-text');

    // Toggle dropdown
    if(header) {
        // Remove existing listener if any to prevent duplicates during fetchLeads calls
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);
        
        newHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
            if(!dropdown.classList.contains('hidden')) {
                searchInput.focus();
            }
        });
    }

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (dropdown && !dropdown.classList.contains('hidden') && !e.target.closest('.custom-select-wrapper')) {
            dropdown.classList.add('hidden');
        }
    });

    // Handle Search
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const optionItems = document.querySelectorAll('.agent-option-item');
            
            optionItems.forEach(item => {
                const label = item.querySelector('label').textContent.toLowerCase();
                if (label.includes(query)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }

    function updateLabelText() {
        if (allAgentsBox.checked) {
            textLabel.textContent = "All Agents";
            return;
        }

        const checkedBoxes = Array.from(agentCheckboxes).filter(cb => cb.checked && cb.id !== 'agent-opt-all');
        
        if (checkedBoxes.length === 0) {
            textLabel.textContent = "Select Agent(s)";
        } else if (checkedBoxes.length === 1) {
            textLabel.textContent = checkedBoxes[0].value;
        } else {
            textLabel.textContent = `${checkedBoxes.length} Agents Selected`;
        }
    }

    // Handle Checkbox interactions
    if(allAgentsBox) {
        allAgentsBox.addEventListener('change', (e) => {
            if (e.target.checked) {
                // If "All" is checked, uncheck individual agents
                agentCheckboxes.forEach(cb => cb.checked = false);
            } else if (!e.target.checked && Array.from(agentCheckboxes).filter(c=>c.checked).length === 0) {
                 // Force it to stay checked if they just clicked it and nothing else is checked
                 e.target.checked = true;
            }
            updateLabelText();
            // Need to trigger the filter function globally - simple hack: fire change event on month to trigger applyDashboardFilters
            document.getElementById('filter-month').dispatchEvent(new Event('change'));
        });
    }

    agentCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            // If an individual agent is checked, uncheck "All"
            const anyChecked = Array.from(agentCheckboxes).some(c => c.checked);
            if(anyChecked) {
                allAgentsBox.checked = false;
            } else {
                allAgentsBox.checked = true;
            }
            
            updateLabelText();
            // Trigger global filter update
            document.getElementById('filter-month').dispatchEvent(new Event('change'));
        });
    });
}
