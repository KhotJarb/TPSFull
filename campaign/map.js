export function initMap(onDistrictClick, onRegionClick) {
    const width = 800;
    const height = 800;
    
    // Create SVG container
    const svg = d3.select("#map-container")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background-color", "#0b0c10"); // Dimly lit vibe

    const projection = d3.geoMercator()
        .center([100.9925, 15.8700])
        .scale(2600)
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    d3.json("thailand.topojson").then(topology => {
        if(!topology) throw new Error("No JSON Data");
        
        const districts = topojson.feature(topology, topology.objects.districts).features;

        svg.selectAll(".district")
            .data(districts)
            .enter().append("path")
            .attr("class", "district")
            .attr("id", d => d.properties.id)
            .attr("data-region", d => d.properties.regionId)
            .attr("d", path)
            .attr("fill", "#1f2833") 
            .attr("stroke", "#0b0c10")
            .attr("stroke-width", 0.5)
            .on("mouseover", function() {
                d3.select(this).attr("stroke", "#66fcf1").attr("stroke-width", 2);
            })
            .on("mouseout", function() {
                d3.select(this).attr("stroke", "#0b0c10").attr("stroke-width", 0.5);
            })
            .on("click", function(event, d) {
                const distId = d.properties.id;
                const regId = d.properties.regionId;
                
                if (window.targetMode === 'region') {
                    onRegionClick(regId);
                } else if (window.targetMode === 'district') {
                    onDistrictClick(distId);
                } else {
                    console.log(`Targeting OFF. District: ${distId}, Region: ${regId}`);
                }
            });
    }).catch(e => {
        console.warn("Mapping Data not found. Using War Room Placeholder Grid.");
        renderPlaceholderMap(svg, onDistrictClick, onRegionClick);
    });
}

function renderPlaceholderMap(svg, onDistrictClick, onRegionClick) {
    const cols = 20;
    // Mock the 400 districts for dynamic rendering
    for(let i = 1; i <= 400; i++) {
        let r = Math.floor((i-1)/cols);
        let c = (i-1)%cols;
        
        let mockRegion = "Northeast";
        if (i <= 33) mockRegion = "Bangkok";
        else if (i <= 108) mockRegion = "South";
        else if (i <= 230) mockRegion = "Central";
        else if (i <= 267) mockRegion = "North";
        
        svg.append("rect")
            .attr("class", "district")
            .attr("x", c * 36 + 40)
            .attr("y", r * 36 + 40)
            .attr("width", 32)
            .attr("height", 32)
            .attr("rx", 4)
            .attr("fill", "#1f2833")
            .attr("stroke", "#0b0c10")
            .attr("id", "D" + i)
            .attr("data-region", mockRegion)
            .on("mouseover", function() {
                d3.select(this).attr("stroke", "#66fcf1");
            })
            .on("mouseout", function() {
                d3.select(this).attr("stroke", "#0b0c10");
            })
            .on("click", function() {
                const distId = "D" + i;
                if (window.targetMode === 'region') {
                    onRegionClick(mockRegion);
                } else if (window.targetMode === 'district') {
                    onDistrictClick(distId);
                } else {
                    console.log(`Targeting OFF. District: ${distId}, Region: ${mockRegion}`);
                }
            });
    }
}

export function updateMapColors(districtWinners, partiesData) {
    // Wave Effect Logic for Election Night
    const dIds = Object.keys(districtWinners);
    
    dIds.forEach((dId, index) => {
        const winnerPartyId = districtWinners[dId];
        const rawColor = partiesData[winnerPartyId].color;
        
        // Ensure path/rect elements ripple into party dominance colors
        d3.select(`#${dId}`)
            .transition()
            .delay(index * 6) // Rapid cascading wave effect across 400 seats
            .duration(600)
            .attr("fill", rawColor)
            .attr("stroke", "#0b0c10")
            .attr("stroke-width", 1);
    });
}
