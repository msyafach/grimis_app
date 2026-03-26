import { Fragment, useEffect, useState } from "react";
import { FiChevronRight } from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";
import { menuList } from "@/utils/fackData/menuList";
import getIcon from "@/utils/getIcon";
import { useAuth } from "../../../context/AuthContext";

const Menus = () => {
    const [openDropdown, setOpenDropdown] = useState(null);
    const [openSubDropdown, setOpenSubDropdown] = useState(null);
    const [activeParent, setActiveParent] = useState("");
    const [activeChild, setActiveChild] = useState("");
    const pathName = useLocation().pathname;
    const { user } = useAuth();

    const handleMainMenu = (e, name) => {
        if (openDropdown === name) {
            setOpenDropdown(null);
        } else {
            setOpenDropdown(name);
        }
    };

    const handleDropdownMenu = (e, name) => {
        e.stopPropagation();
        if (openSubDropdown === name) {
            setOpenSubDropdown(null);
        } else {
            setOpenSubDropdown(name);
        }
    };

    useEffect(() => {
        // Cek apakah path adalah sub-menu dari dashboard
        const isDashboardSubMenu = (path) => {
            // Daftar sub-menu dashboard (sesuaikan dengan struktur menuList dashboard)
            const dashboardSubPaths = ['/peta-risiko']; // tambahkan path sub-menu dashboard lainnya di sini
            return dashboardSubPaths.some(subPath => path.startsWith(subPath));
        };

        if (pathName === "/" || isDashboardSubMenu(pathName)) {
            // Set dashboard sebagai aktif jika di root path atau di sub-menu dashboard
            setActiveParent("dashboards");
            setOpenDropdown("dashboards");

            if (pathName !== "/") {
                // Jika di sub-menu dashboard, set child yang aktif
                const pathSegments = pathName.split("/").filter(segment => segment !== "");
                if (pathSegments.length > 0) {
                    setActiveChild(pathSegments[0]);
                    setOpenSubDropdown(pathSegments[0]);
                }
            } else {
                setActiveChild("");
                setOpenSubDropdown(null);
            }
        } else {
            // Untuk path selain dashboard dan sub-menu dashboard
            const pathSegments = pathName.split("/").filter(segment => segment !== "");
            if (pathSegments.length > 0) {
                const firstSegment = pathSegments[0];
                setActiveParent(firstSegment);
                setOpenDropdown(firstSegment);

                if (pathSegments.length > 1) {
                    setActiveChild(pathSegments[1]);
                    setOpenSubDropdown(pathSegments[1]);
                } else {
                    setActiveChild("");
                    setOpenSubDropdown(null);
                }
            }
        }
    }, [pathName]);

    // Filter menu based on user role
    const userRole = user?.role || '';
    const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN_KLP';

    // Filter menu items based on role
    let filteredMenuList = menuList.map(menu => {
        if (menu.name === "parameters" && menu.dropdownMenu) {
            return {
                ...menu,
                dropdownMenu: menu.dropdownMenu.filter(item => {
                    // Bagan Risiko is always hidden
                    if (item.name === "Bagan Risiko") return false;

                    // Usulan Kamus Risiko - only for Pemilik/Pengelola (not Admin)
                    if (item.name === "Usulan Kamus Risiko") {
                        return !isAdmin;
                    }

                    return true;
                })
            };
        }
        return menu;
    });

    const formatMenuName = (name) => {
        return name
            .replace(/-/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <>
            {filteredMenuList.map(({ dropdownMenu, id, name, path, icon }) => {
                // Determine if any sub-menu or sub-sub-menu within this main menu is active
                const isAnyChildActive = dropdownMenu.some(sub =>
                    pathName.startsWith(sub.path) || (sub.subdropdownMenu && sub.subdropdownMenu.some(subSub => pathName.startsWith(subSub.path)))
                );

                // Perbaikan logika untuk menentukan menu aktif
                let isMainMenuActive = false;

                if (pathName === "/" && name === "dashboards") {
                    // Hanya dashboard yang aktif jika di root path
                    isMainMenuActive = true;
                } else if (pathName !== "/") {
                    // Untuk path selain root, cek apakah path dimulai dengan menu path atau ada child yang aktif
                    isMainMenuActive = pathName.startsWith(path) || isAnyChildActive;

                    // Khusus untuk dashboard, jangan aktif jika bukan di root path
                    if (name === "dashboards" && pathName !== "/") {
                        isMainMenuActive = false;
                    }
                }

                const isMainMenuTriggered = openDropdown === name || isMainMenuActive;

                return (
                    <li
                        key={id}
                        onClick={(e) => handleMainMenu(e, name)}
                        className={`nxl-item nxl-hasmenu ${isMainMenuActive ? "active" : ""} ${isMainMenuTriggered ? "nxl-trigger" : ""}`}
                    >
                        <Link to={path} className="nxl-link text-capitalize">
                            <span className="nxl-micon"> {getIcon(icon)} </span>
                            <span className="nxl-mtext" style={{ paddingLeft: "2.5px" }}>
                                {formatMenuName(name)}
                            </span>
                            <span className="nxl-arrow fs-16">
                                <FiChevronRight />
                            </span>
                        </Link>
                        <ul
                            className={`nxl-submenu ${isMainMenuTriggered ? "nxl-menu-visible" : "nxl-menu-hidden"}`}
                        >
                            {dropdownMenu.map(({ id, name, path, subdropdownMenu }) => {
                                const x = name;
                                // Determine if any sub-sub-menu within this sub-menu is active
                                const isAnySubChildActive = subdropdownMenu && subdropdownMenu.some(subSub => pathName.startsWith(subSub.path));
                                const isSubMenuActive = pathName.startsWith(path) || isAnySubChildActive;
                                const isSubMenuTriggered = openSubDropdown === x || isSubMenuActive;

                                return (
                                    <Fragment key={id}>
                                        {subdropdownMenu?.length ? (
                                            <li
                                                className={`nxl-item nxl-hasmenu ${isSubMenuActive ? "active" : ""}`}
                                                onClick={(e) => handleDropdownMenu(e, x)}
                                            >
                                                <Link to={path} className={`nxl-link text-capitalize`}>
                                                    <span className="nxl-mtext">{formatMenuName(name)}</span>
                                                    <span className="nxl-arrow">
                                                        <i>
                                                            {" "}
                                                            <FiChevronRight />
                                                        </i>
                                                    </span>
                                                </Link>
                                                <ul
                                                    key={id}
                                                    className={`nxl-submenu ${isSubMenuTriggered ? "nxl-menu-visible" : "nxl-menu-hidden "}`}
                                                >
                                                    {subdropdownMenu.map(({ id, name, path }) => {
                                                        return (
                                                            <li
                                                                key={id}
                                                                className={`nxl-item ${pathName.startsWith(path) ? "active" : ""}`}
                                                            >
                                                                <Link
                                                                    className="nxl-link text-capitalize"
                                                                    to={path}
                                                                >
                                                                    {formatMenuName(name)}
                                                                </Link>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </li>
                                        ) : (
                                            <li
                                                className={`nxl-item ${pathName.startsWith(path) ? "active" : ""}`}
                                            >
                                                <Link className="nxl-link" to={path}>
                                                    {formatMenuName(name)}
                                                </Link>
                                            </li>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </ul>
                    </li>
                );
            })}
        </>
    );
};

export default Menus;