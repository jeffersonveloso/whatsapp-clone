import { Lock, Menu } from "lucide-react";
import Image from "next/image";
import { Button } from "../ui/button";

type ChatPlaceHolderProps = {
	onOpenSidebar?: () => void;
};

const ChatPlaceHolder = ({ onOpenSidebar }: ChatPlaceHolderProps) => {
	return (
		<div className='w-full md:w-3/4 bg-gray-secondary flex flex-col items-center justify-center py-6 md:py-10'>
			<div className='w-full px-4 md:hidden'>
				<button
					type='button'
					className='inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition'
					onClick={onOpenSidebar}
				>
					<Menu size={18} />
					Open conversations
				</button>
			</div>
			<div className='flex flex-col items-center w-full justify-center py-10 gap-4'>
				<Image src={"/desktop-hero.png"} alt='Hero' width={320} height={188} />
				<p className='text-3xl font-extralight mt-5 mb-2'>Download WhatsApp for Windows</p>
				<p className='w-full md:w-1/2 text-center text-gray-primary text-sm text-muted-foreground px-6 md:px-0'>
					Make calls, share your screen and get a faster experience when you download the Windows app.
				</p>

				<Button className='rounded-full my-5 bg-green-primary hover:bg-green-secondary'>
					Get from Microsoft Store
				</Button>
			</div>
			<p className='w-full md:w-1/2 mt-auto text-center text-gray-primary text-xs text-muted-foreground flex items-center justify-center gap-1 px-6 md:px-0'>
				<Lock size={10} /> Your personal messages are end-to-end encrypted
			</p>
		</div>
	);
};
export default ChatPlaceHolder;
