import React, { useContext, useEffect, useRef, useState } from 'react'
import { FiAlignLeft, FiArrowLeft, FiArrowRight, FiChevronRight, FiMaximize, FiMinimize, FiMoon, FiPlus, FiSun, FiMenu } from "react-icons/fi";
import LanguagesModal from './LanguagesModal';
import NotificationsModal from './NotificationsModal';
import ProfileModal from './ProfileModal';
import SearchModal from './SearchModal';
import TimesheetsModal from './TimesheetsModal';
import HeaderDropDownModal from './HeaderDropDownModal';
import MegaMenu from './megaManu/MegaMenu';
import { NavigationContext } from '../../../contentApi/navigationProvider';
import YearModal from './YearModal';
import CompanyModal from './CompanyModal';
import InstansiModal from './InstansiModal';
import UnitKerjaModal from './UnitKerjaModal';
import LaporanKejadianModal from './LaporanKejadianModal';


const Header = () => {
    const { navigationOpen, setNavigationOpen } = useContext(NavigationContext)
    const [openMegaMenu, setOpenMegaMenu] = useState(false)
    const [navigationExpend, setNavigationExpend] = useState(false)
    const miniButtonRef = useRef(null);
    const expendButtonRef = useRef(null);
    const [selectedYear, setSelectedYear] = useState('');


    useEffect(() => {
        if (openMegaMenu) {
            document.documentElement.classList.add("nxl-lavel-mega-menu-open")
        }
        else {
            document.documentElement.classList.remove("nxl-lavel-mega-menu-open")
        }
    }, [openMegaMenu])

    const handleThemeMode = (type) => {
        if (type === "dark") {
            document.documentElement.classList.add("app-skin-dark")
            localStorage.setItem("skinTheme", "dark");
        }
        else {
            document.documentElement.classList.remove("app-skin-dark")
            localStorage.setItem("skinTheme", "light");
        }
    }

    useEffect(() => {
        const handleResize = () => {
            const newWindowWidth = window.innerWidth;
            if (newWindowWidth >= 1025 && newWindowWidth <= 1400) {
                document.documentElement.classList.add('minimenu');
                setNavigationExpend(true);
            } else if (newWindowWidth > 1400) {
                document.documentElement.classList.remove('minimenu');
                setNavigationExpend(false);
            }
        };

        window.addEventListener('resize', handleResize);

        handleResize();

        const savedSkinTheme = localStorage.getItem("skinTheme");
        handleThemeMode(savedSkinTheme)

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const handleNavigationExpendUp = (e, pram) => {
        e.preventDefault()
        if (pram === "show") {
            setNavigationExpend(true);
            document.documentElement.classList.add('minimenu')
        }
        else {
            setNavigationExpend(false);
            document.documentElement.classList.remove('minimenu')
        }
    }

    const handleNavigationExpendDown = (e, pram) => {
        e.preventDefault()
        if (pram === "show") {
            setNavigationExpend(true);
            document.documentElement.classList.remove('minimenu')
        }
        else {
            setNavigationExpend(false);
            document.documentElement.classList.add('minimenu')
        }
    }

    const fullScreenMaximize = () => {
        const elem = document.documentElement;

        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }

        document.documentElement.classList.add("fsh-infullscreen")
        document.querySelector("body").classList.add("full-screen-helper")

    };
    const fullScreenMinimize = () => {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }

        document.documentElement.classList.remove("fsh-infullscreen")
        document.querySelector("body").classList.remove("full-screen-helper")
    }

    return (
        <header className="nxl-header">
            <div className="header-wrapper">

                {/* <!--! [Start] Header Left !--> */}
                <div className="header-left d-flex align-items-center gap-2">
                    {/* Mobile hamburger — only shown on small screens */}
                    <a href="#" className="nxl-head-mobile-toggler d-lg-none" onClick={(e) => { e.preventDefault(); setNavigationOpen(true); }} id="mobile-collapse">
                        <div className={`hamburger hamburger--arrowturn ${navigationOpen ? "is-active" : ""}`}>
                            <div className="hamburger-box">
                                <div className="hamburger-inner"></div>
                            </div>
                        </div>
                    </a>

                    {/* Desktop sidebar toggle — single button, hidden on mobile */}
                    <div className="nxl-navigation-toggle d-none d-lg-flex">
                        <a href="#" onClick={(e) => { e.preventDefault(); setNavigationExpend(!navigationExpend); document.documentElement.classList.toggle('minimenu'); }}>
                            {navigationExpend ? <FiArrowRight size={24} /> : <FiMenu size={24} />}
                        </a>
                    </div>
                </div>
                {/* <!--! [End] Header Left !-->
                <!--! [Start] Header Right !--> */}
                <div className="header-right ms-auto">
                    <div className="d-flex align-items-center">
                        <div className="nxl-h-item d-none d-sm-flex" >
                            <div className="full-screen-switcher">
                                <span className="nxl-head-link me-0">
                                    <FiMaximize size={20} className="maximize" onClick={fullScreenMaximize} />
                                    <FiMinimize size={20} className="minimize" onClick={fullScreenMinimize} />
                                </span>
                            </div>
                        </div>
                        <NotificationsModal />
                        <YearModal />
                        <InstansiModal />
                        <UnitKerjaModal />
                        <LaporanKejadianModal />
                        <ProfileModal />
                    </div>
                </div>
                {/* <!--! [End] Header Right !--> */}
            </div>
        </header>
    )
}

export default Header