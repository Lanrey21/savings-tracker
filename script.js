let goals = [];

let editingGoalId = null;

async function loadGoals() {
    const savedGoals = localStorage.getItem("goals");

    if (savedGoals) {

        goals = JSON.parse(savedGoals);
    } else {

        const response = await fetch("./data.json");
        const data = await response.json();

        goals = data.goals;
    }

    applyFilterAndSort();
    updateStats();
    renderChart();
}
function getSavedAmount(goal) {
    return goal.deposits.reduce((total, deposit) => {
        return total + deposit.amount;
    }, 0);
}

function getProgress(goal) {
    return Math.round((getSavedAmount(goal) / goal.target) * 100);
}


function saveGoals() {
    localStorage.setItem("goals", JSON.stringify(goals));
}

function renderGoals(goalsToRender) {
    const container = document.getElementById("goals-container");

    container.innerHTML = "";

    goalsToRender.forEach(goal => {
        const savedAmount = getSavedAmount(goal);

        const progress = getProgress(goal);

        const isCompleted = savedAmount >= goal.target;

        const formattedDate = goal.deadline
            ? new Date(goal.deadline).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
            })
            : "No deadline";

        const card = `
      <div class="goal-card">

        <div class="goal-header">
          <h3>${goal.name}</h3>
        </div>

        <div class="goal-money">
          <p>Saved: $${savedAmount.toLocaleString()}</p>
          <p>Target: $${goal.target.toLocaleString()}</p>
        </div>

        <div class="progress-section">
          <div class="progress-label">
            <span>${isCompleted ? "Completed 🎉" : "In Progress"}</span>
            <span>${progress}%</span>
          </div>

          <div class="progress-track">
            <div
              class="progress-fill"
              style="width: ${progress}%;">
            </div>
          </div>
        </div>

        <p class="deadline">
          Deadline: ${formattedDate}
        </p>

        <button
  class="edit-goal-btn"
  data-id="${goal.id}">
  Edit
</button>

  <button
    class="add-deposit-btn"
    data-id="${goal.id}">
    + Deposit
  </button>

<button
    class="history-btn"
    data-id="${goal.id}">
    History
</button>


  <button
    class="delete-goal-btn"
    data-id="${goal.id}">
    Delete
  </button>

      
      </div>
    `;

        container.innerHTML += card;
    });
}

function updateStats() {
    const totalSavingsEl = document.getElementById("total-savings");
    const activeGoalsEl = document.getElementById("active-goals");
    const completedGoalsEl = document.getElementById("completed-goals");

    const totalSavings = goals.reduce((grandTotal, goal) => {
        return grandTotal + getSavedAmount(goal);
    }, 0);

    totalSavingsEl.textContent = `$${totalSavings.toLocaleString()}`;

    const completedGoals = goals.filter(goal => {
        return getSavedAmount(goal) >= goal.target;
    });
    completedGoalsEl.textContent = completedGoals.length;

    const activeGoals = goals.length - completedGoals.length;

    activeGoalsEl.textContent = activeGoals;
}

function renderChart() {

    const monthlyTotals = {};
    goals.forEach(goal => {
        goal.deposits.forEach(deposit => {
            const month = new Date(deposit.createdAt).toLocaleDateString("en-US", {
                month: "short"
            });
            if (!monthlyTotals[month]) {
                monthlyTotals[month] = deposit.amount;
            } else {
                monthlyTotals[month] += deposit.amount;
            }

        });

    });
    const chartContainer = document.getElementById("chart-container");

    chartContainer.innerHTML = "";

    chartContainer.innerHTML = `<div class="chart-bars"></div>`;

    const chartBars = chartContainer.querySelector(".chart-bars");

    const maxAmount = Math.max(...Object.values(monthlyTotals));

    for (const month in monthlyTotals) {

        const amount = monthlyTotals[month];

        const height = (amount / maxAmount) * 180;

        const bar = `
    <div class="chart-bar">

        <div
            class="bar"
            title="$${amount.toLocaleString()}"
            style="height: ${height}px;">
        </div>

        <p>${month}</p>

    </div>
`;


        chartBars.innerHTML += bar;
    }
}

function applyFilterAndSort() {
    let filteredGoals = [...goals];

    const selectedFilter = filterSelect.value;
    const selectedSort = sortSelect.value;

    if (selectedFilter === "active") {
        filteredGoals = filteredGoals.filter(goal => {
            return getSavedAmount(goal) < goal.target;
        });
    }

    if (selectedFilter === "completed") {
        filteredGoals = filteredGoals.filter(goal => {
            return getSavedAmount(goal) >= goal.target;
        });
    }
    if (selectedSort === "alphabetical") {
        filteredGoals.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });
    }

    if (selectedSort === "deadline") {
        filteredGoals.sort((a, b) => {

            if (!a.deadline) return 1;

            if (!b.deadline) return -1;

            return new Date(a.deadline) - new Date(b.deadline);
        });
    }

    if (selectedSort === "saved") {
        filteredGoals.sort((a, b) => {
            const savedAmountA = getSavedAmount(a);
            const savedAmountB = getSavedAmount(b);

            return savedAmountA - savedAmountB;
        });
    }
    if (selectedSort === "progress") {
        filteredGoals.sort((a, b) => {
            const progressA = getProgress(a);
            const progressB = getProgress(b);

            return progressA - progressB;
        });
    }
    renderGoals(filteredGoals);
    const deleteButtons = document.querySelectorAll(".delete-goal-btn");

    deleteButtons.forEach(button => {
        button.addEventListener("click", () => {
            const goalId = button.dataset.id;

            goals = goals.filter(goal => {
                return goal.id !== goalId;
            });

            saveGoals();

            applyFilterAndSort();
            updateStats();
            renderChart();
        });
    });

    const depositButtons = document.querySelectorAll(".add-deposit-btn");
    depositButtons.forEach(button => {
        button.addEventListener("click", () => {
            const goalId = button.dataset.id;

            const amount = Number(prompt("Enter deposit amount:"));

            if (amount <= 0) {
                alert("Please enter a valid deposit amount");
                return;
            }

            const goal = goals.find(goal => {
                return goal.id === goalId;
            });

            goal.deposits.push({
                id: Date.now().toString(),
                amount: amount,
                note: "Manual deposit",
                createdAt: new Date().toISOString()
            });
            saveGoals();


            applyFilterAndSort();
            updateStats();
            renderChart();
        });
    });

    const editButtons = document.querySelectorAll(".edit-goal-btn");

    editButtons.forEach(button => {
        button.addEventListener("click", () => {
            const goalId = button.dataset.id;

            editingGoalId = goalId;

            const goal = goals.find(goal => {
                return goal.id === editingGoalId;
            });

            if (!goal) {
                return;
            }

            goalNameInput.value = goal.name;
            goalTargetInput.value = goal.target;
            goalDeadlineInput.value = goal.deadline || "";

            goalModal.classList.remove("hidden");
        });
    });

    const historyButtons = document.querySelectorAll(".history-btn");

    historyButtons.forEach(button => {
        button.addEventListener("click", () => {

            const goalId = button.dataset.id;

            const goal = goals.find(goal => {
                return goal.id === goalId;
            });

            if (!goal) {
                return;
            }

            let html = "";

            if (goal.deposits.length === 0) {
                html = "<p>No deposits yet.</p>";
            } else {

                goal.deposits.forEach(deposit => {

                    html += `
                    <div class="deposit-item">
                        <p><strong>$${deposit.amount.toLocaleString()}</strong></p>
                        <p>${deposit.note}</p>
                        <small>
                            ${new Date(deposit.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                    })}
                        </small>
                    </div>
                `;

                });

            }

            historyList.innerHTML = html;

            historyModal.classList.remove("hidden");

        });
    });
}
const addGoalBtn = document.querySelector(".add-goal-btn");

const goalModal = document.getElementById("goal-modal");

const cancelGoalBtn = document.getElementById("cancel-goal-btn");

const filterSelect = document.getElementById("filter-goals");

const sortSelect = document.getElementById("sort-goals");
const goalNameInput = document.getElementById("goal-name");

const goalTargetInput = document.getElementById("goal-target");

const goalDeadlineInput = document.getElementById("goal-deadline");

const saveGoalBtn = document.getElementById("save-goal-btn");

const historyModal = document.getElementById("history-modal");

const historyList = document.getElementById("history-list");

const closeHistoryBtn = document.getElementById("close-history-btn");
addGoalBtn.addEventListener("click", () => {
    // We're creating a new goal, not editing
    editingGoalId = null;

    goalNameInput.value = "";
    goalTargetInput.value = "";
    goalDeadlineInput.value = "";

    goalModal.classList.remove("hidden");
});

cancelGoalBtn.addEventListener("click", () => {
    goalModal.classList.add("hidden");
});

saveGoalBtn.addEventListener("click", () => {
    const goalName = goalNameInput.value.trim();

    if (!goalName) {
        alert("Please enter a goal name");
        return;
    }
    const goalTarget = Number(goalTargetInput.value);

    if (goalTarget <= 0) {
        alert("Please enter a valid target amount");
        return;
    }

    if (editingGoalId) {

        const goal = goals.find(goal => {
            return goal.id === editingGoalId;
        });

        goal.name = goalName;
        goal.target = goalTarget;
        goal.deadline = goalDeadlineInput.value || null;

        editingGoalId = null;

    } else {

        const newGoal = {
            id: Date.now().toString(),
            name: goalName,
            target: goalTarget,
            deadline: goalDeadlineInput.value || null,
            createdAt: new Date().toISOString(),
            deposits: []
        };

        goals.push(newGoal);
    }

    saveGoals();

    applyFilterAndSort();
    updateStats();
    renderChart();

    goalNameInput.value = "";
    goalTargetInput.value = "";
    goalDeadlineInput.value = "";

    goalModal.classList.add("hidden");
});

closeHistoryBtn.addEventListener("click", () => {
    historyModal.classList.add("hidden");
});
sortSelect.addEventListener("change", applyFilterAndSort);

filterSelect.addEventListener("change", applyFilterAndSort);

loadGoals();