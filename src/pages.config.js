/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AIHub from './pages/AIHub';
import Analytics from './pages/Analytics';
import Banking from './pages/Banking';
import Casinos from './pages/Casinos';
import CloudMining from './pages/CloudMining';
import DeFiStrategies from './pages/DeFiStrategies';
import Education from './pages/Education';
import Legacy from './pages/Legacy';
import Marketing from './pages/Marketing';
import NFTs from './pages/NFTs';
import Poker from './pages/Poker';
import Privacy from './pages/Privacy';
import Receive from './pages/Receive';
import Settings from './pages/Settings';
import Swap from './pages/Swap';
import TradingBots from './pages/TradingBots';
import VirtualCard from './pages/VirtualCard';
import Send from './pages/Send';
import Portfolio from './pages/Portfolio';
import DApps from './pages/DApps';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIHub": AIHub,
    "Analytics": Analytics,
    "Banking": Banking,
    "Casinos": Casinos,
    "CloudMining": CloudMining,
    "DeFiStrategies": DeFiStrategies,
    "Education": Education,
    "Legacy": Legacy,
    "Marketing": Marketing,
    "NFTs": NFTs,
    "Poker": Poker,
    "Privacy": Privacy,
    "Receive": Receive,
    "Settings": Settings,
    "Swap": Swap,
    "TradingBots": TradingBots,
    "VirtualCard": VirtualCard,
    "Send": Send,
    "Portfolio": Portfolio,
    "DApps": DApps,
}

export const pagesConfig = {
    mainPage: "Portfolio",
    Pages: PAGES,
    Layout: __Layout,
};