
import { getFilterOptions } from "../src/lib/db/queries";

async function main() {
    try {
        console.log("Checking filter options...");
        const options = await getFilterOptions();
        console.log(JSON.stringify(options.categories, null, 2));
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
