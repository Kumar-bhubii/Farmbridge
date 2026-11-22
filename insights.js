
/* =========================================================
   FARMBRIDGE - insights.js
   Firestore-backed platform activity charts.
   ========================================================= */

(function () {
  "use strict";

  function sumKg(list) {
    return list.reduce(function (sum, item) {
      return sum + Number(item.quantityKg || 0);
    }, 0);
  }

  // ---------- KPI COUNTER ANIMATION ----------

  function countUp(id, value) {
    const element = document.getElementById(id);

    if (!element) return;

    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / 1200, 1);

      element.textContent = Math.round(
        value * (1 - Math.pow(1 - progress, 3))
      ).toLocaleString("en-IN");

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }

  // ---------- LOAD INSIGHTS ----------

  async function loadInsights() {
    try {

      if (window.FB_USER_READY) {
        const activeUser = await window.FB_USER_READY;

        if (!activeUser) return;
      }

      if (window.FB_DATA_READY) {
        await window.FB_DATA_READY;
      }

      const lots = getListings();
      const demands = getDemands();
      const enquiries = getEnquiries();

      const available = lots.filter(function (item) {
        return item.status === "available";
      });

      const open = demands.filter(function (item) {
        return item.status === "open";
      });

      // ---------- KPI VALUES ----------

      countUp("k-supply", sumKg(available));

      countUp("k-demand", sumKg(open));

      countUp(
        "k-farmers",
        new Set(
          available.map(function (item) {
            return item.farmerUid || item.farmerPhone;
          })
        ).size
      );

      countUp(
        "k-deals",
        enquiries.filter(function (item) {
          return item.status === "completed";
        }).length
      );

      // ---------- CHECK CHART.JS ----------

      if (typeof Chart === "undefined") {
        console.warn("Chart.js has not loaded.");
        return;
      }

      Chart.defaults.font.family = "DM Sans";
      Chart.defaults.color = "#22302b";

      // ---------- CANVAS ELEMENTS ----------

      const cropCanvas = document.getElementById("c-crop");
      const pipelineCanvas = document.getElementById("c-pipe");
      const timeCanvas = document.getElementById("c-time");

      // ---------- CHART 1: SUPPLY VS DEMAND ----------

      if (cropCanvas) {

        new Chart(cropCanvas, {
          type: "bar",

          data: {
            labels: CROPS.map(function (crop) {
              return crop.emoji + " " + crop.name;
            }),

            datasets: [
              {
                label: "Available supply (kg)",
                backgroundColor: "#5e7f55",
                borderRadius: 8,

                data: CROPS.map(function (crop) {
                  return sumKg(
                    available.filter(function (item) {
                      return item.crop === crop.id;
                    })
                  );
                })
              },

              {
                label: "Open demand (kg)",
                backgroundColor: "#d9a84a",
                borderRadius: 8,

                data: CROPS.map(function (crop) {
                  return sumKg(
                    open.filter(function (item) {
                      return item.crop === crop.id;
                    })
                  );
                })
              }
            ]
          },

          options: {
            responsive: true,
            maintainAspectRatio: false,

            animation: {
              duration: 1200
            }
          }
        });
      }

      // ---------- CHART 2: ORDER PIPELINE ----------

      if (pipelineCanvas) {

        const stages = ENQ_STEPS.concat([
          "declined",
          "cancelled"
        ]);

        new Chart(pipelineCanvas, {
          type: "doughnut",

          data: {
            labels: stages.map(function (stage) {
              return ENQ_LABELS[stage] || stage;
            }),

            datasets: [
              {
                data: stages.map(function (stage) {
                  return enquiries.filter(function (item) {
                    return item.status === stage;
                  }).length;
                }),

                backgroundColor: [
                  "#f1d9a0",
                  "#d9a84a",
                  "#5e7f55",
                  "#1d4d3c",
                  "#123329",
                  "#c06f4c",
                  "#e2d9c6"
                ],

                borderWidth: 3,
                borderColor: "#fffdf8"
              }
            ]
          },

          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "62%"
          }
        });
      }

      // ---------- CHART 3: LAST 14 DAYS ----------

      if (timeCanvas) {

        const days = [];

        for (let i = 13; i >= 0; i--) {
          const date = new Date();

          date.setDate(date.getDate() - i);

          days.push(date.toISOString().slice(0, 10));
        }

        function perDay(list) {
          return days.map(function (day) {
            return list.filter(function (item) {
              return (item.createdAt || "").slice(0, 10) === day;
            }).length;
          });
        }

        new Chart(timeCanvas, {
          type: "line",

          data: {
            labels: days.map(function (day) {
              return day.slice(5);
            }),

            datasets: [
              {
                label: "Crop listings",
                data: perDay(lots),

                borderColor: "#1d4d3c",
                backgroundColor: "rgba(29,77,60,.15)",

                fill: true,
                tension: 0.4
              },

              {
                label: "Buyer requirements",
                data: perDay(demands),

                borderColor: "#c06f4c",
                backgroundColor: "rgba(192,111,76,.12)",

                fill: true,
                tension: 0.4
              }
            ]
          },

          options: {
            responsive: true,
            maintainAspectRatio: false,

            scales: {
              y: {
                beginAtZero: true,

                ticks: {
                  precision: 0
                }
              }
            }
          }
        });
      }

    } catch (error) {
      console.error("Insights loading failed:", error);
    }
  }

  // ---------- INITIALIZE ----------

  loadInsights();

})();
