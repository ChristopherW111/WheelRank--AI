// ========================================
// AI BIKE SEARCH  (Choose Your Bike)
// Uses OpenAI web search (via /bike-search)
// to pull real, current bike models instead
// of a fixed hardcoded list.
// ========================================

const bikeCategory = document.getElementById("bikeCategory");
const bikeSearchInput = document.getElementById("bikeSearchInput");
const bikeSearchBtn = document.getElementById("bikeSearchBtn");
const buildBike = document.getElementById("buildBike");

function fillBuildBike(list) {
    buildBike.innerHTML = "";
    list.forEach(name => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        buildBike.appendChild(opt);
    });
}

async function searchBikes() {

    const category = bikeCategory.value;
    const query = bikeSearchInput.value.trim();

    buildBike.innerHTML = query
        ? `<option>:mag_right: Searching the web for "${query}"...</option>`
        : "<option>:mag_right: Searching the web...</option>";

    bikeSearchBtn.disabled = true;
    bikeSearchBtn.textContent = "Searching...";

    try {

        const response = await fetch("/bike-search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ category, query })
        });

        const text = await response.text();

        if (!text) {
            throw new Error("Server returned an empty response.");
        }

        const data = JSON.parse(text);

        if (!response.ok || !data.bikes || !data.bikes.length) {
            throw new Error(data.error || `No bikes found for "${query}".`);
        }

        fillBuildBike(data.bikes);

    } catch (error) {

        console.error(error);

        // No hardcoded presets — always reflect what the live search
        // actually returned (or didn't).
        buildBike.innerHTML = `<option value="">:warning: ${error.message}</option>`;

    } finally {

        bikeSearchBtn.disabled = false;
        bikeSearchBtn.textContent = ":mag: Search";

    }

}

bikeSearchBtn.addEventListener("click", searchBikes);
bikeSearchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        searchBikes();
    }
});
bikeCategory.addEventListener("change", searchBikes);

// Load an initial batch of bikes as soon as the page opens.
searchBikes();



// ========================================
// BIKE RECOMMENDATION
// ========================================

const rankBtn = document.getElementById("rankBtn");

rankBtn.addEventListener("click", async () => {

    const bikeName = document.getElementById("bikeName");
    const score = document.getElementById("score");
    const reasons = document.getElementById("reasons");

    bikeName.textContent = "Thinking...";
    score.textContent = "--";
    reasons.innerHTML =
        "<li>WheelRank AI is finding your perfect bike...</li>";

    try {

        const response = await fetch("/recommend", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                budget: document.getElementById("budget").value,
                experience: document.getElementById("experience").value,
                bikeType: document.getElementById("bikeType").value,
                goal: document.getElementById("goal").value
            })
        });

        const text = await response.text();

        if (!text) {
            throw new Error("Server returned an empty response.");
        }

        const data = JSON.parse(text);

        if (!response.ok) {
            throw new Error(data.error || "Unknown server error.");
        }

        bikeName.textContent = data.bike;
        score.textContent = data.score;

        reasons.innerHTML = "";

        data.reasons.forEach(reason => {
            const li = document.createElement("li");
            li.textContent = reason;
            reasons.appendChild(li);
        });

    } catch (error) {

        bikeName.textContent = "Error";
        score.textContent = "--";
        reasons.innerHTML = `<li>${error.message}</li>`;
        console.error(error);

    }

});



// ========================================
// AI BIKE BUILDER
// ========================================

const generateBtn = document.getElementById("generateBtn");

generateBtn.addEventListener("click", async () => {

    const designText = document.getElementById("designText");
    const bikeImage = document.getElementById("bikeImage");

    if (!buildBike.value) {
        designText.innerHTML = "<p>Please search for and pick a bike above first.</p>";
        return;
    }

    designText.innerHTML = "<p>Generating your dream build...</p>";
    bikeImage.style.display = "none";

    const payload = {
        bike: buildBike.value,
        height: document.getElementById("height").value,
        build: document.getElementById("build").value,
        dream: document.getElementById("dream").value
    };

    // 1. Get the written build plan
    try {

        const response = await fetch("/build", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const text = await response.text();

        if (!text) {
            throw new Error("Server returned an empty response.");
        }

        const data = JSON.parse(text);

        if (!response.ok) {
            throw new Error(data.error || "Unknown server error.");
        }

        designText.innerHTML = `
            <h3>${data.title}</h3>
            <p>${data.description}</p>
            <p class="image-status">:art: Generating a concept image...</p>
        `;

    } catch (error) {

        designText.innerHTML = `
            <h3>Error</h3>
            <p>${error.message}</p>
        `;
        console.error(error);
        return;

    }

    // 2. Generate a matching concept image for that same build
    try {

        const imageResponse = await fetch("/generate-image", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const imageData = await imageResponse.json();

        if (!imageResponse.ok) {
            throw new Error(imageData.error || "Image generation failed.");
        }

        bikeImage.src = "data:image/png;base64," + imageData.image;
        bikeImage.style.display = "block";

        const status = designText.querySelector(".image-status");
        if (status) status.remove();

    } catch (error) {

        const status = designText.querySelector(".image-status");
        if (status) status.textContent = ":warning: Concept image could not be generated.";
        console.error(error);

    }

});