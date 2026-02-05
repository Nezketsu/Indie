
import { getFilterOptions } from "@/lib/db/queries";

export default async function DebugPage() {
    try {
        const options = await getFilterOptions();

        return (
            <div className="p-8 font-mono text-sm max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-4">Debug Filter Options</h1>
                <div className="bg-gray-100 p-4 rounded overflow-auto">
                    <pre>{JSON.stringify(options, null, 2)}</pre>
                </div>
            </div>
        );
    } catch (error) {
        return (
            <div className="p-8 text-red-500">
                <h1 className="text-xl font-bold">Error</h1>
                <pre>{String(error)}</pre>
            </div>
        );
    }
}
