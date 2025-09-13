import Header from './Header';
import Footer from './Footer';
import FloatingChatIcon from './FloatingChatIcon';
import { Outlet, Link, useLocation } from "react-router-dom";

const isFullWidth = true;

const BasicLayout = () => {
    const location = useLocation();

    // FloatingChatIcon을 숨길 경로 패턴들
    const hideChatIconPatterns = [
        /^\/commerce\/\d+\/before-payment$/,
        /^\/commerce\/\d+\/payment$/,
        /^\/chat(\/.*)?$/,
        /^\/admin\/chat(\/.*)?$/,
        /^\/openchat(\/.*)?$/,
        /^\/admin\/openchat(\/.*)?$/
    ];

    const shouldShowChatIcon = !hideChatIconPatterns.some(pattern =>
        pattern.test(location.pathname)
    );

    return (
        <div className="min-h-screen overflow-x-hidden bg-gray-50">
            {/* Header */}
            <Header />

            {/* Main */}
            <main className="w-full">
                <Outlet />
            </main>

            {/* Footer */}
            <Footer />
            {shouldShowChatIcon && <FloatingChatIcon />}
        </div>
    );
};

export default BasicLayout;
