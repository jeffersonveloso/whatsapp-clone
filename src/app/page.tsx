import {Suspense} from "react";
import LeftPanel from "@/components/home/left-panel";
import RightPanel from "@/components/home/right-panel";

export default function Home() {
    return (
        <main>
            <div className='flex overflow-y-hidden h-[calc(100vh)] w-full mx-auto bg-left-panel'>
                {/* Green background decorator for Light Mode */}
                <div className='fixed top-0 left-0 w-full h-36 bg-green-primary dark:bg-transparent -z-30'/>
                <Suspense fallback={<div className='hidden md:flex md:h-full md:w-1/4 md:max-w-sm bg-left-panel border-gray-600 border-r' />}> 
                    <LeftPanel/>
                </Suspense>
                <RightPanel/>
            </div>
        </main>
    );
}
