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
    let filteredMenuList = menuList.filter(menu => {
        if (menu.name === "organisasi" && user?.role !== "SUPER_ADMIN") {
            return false;
        }
        if (menu.name === "settings-unit-kerja" && user?.role !== "ADMIN_KLP" && user?.role !== "SUPER_ADMIN") {
            return false;
        }
        // Filter settings-unit-kerja menu items based on role
        if (menu.name === "settings-unit-kerja") {
            return {
                ...menu,
                dropdownMenu: menu.dropdownMenu.filter(item => {
                    // Only SUPER_ADMIN and ADMIN_KLP can access Group Management
                    if (item.name === "Manajemen Group" && user?.role !== "SUPER_ADMIN" && user?.role !== "ADMIN_KLP") {
                        return false;
                    }
                    return true;
                })
            };
        }
        // Hide kriteria-risiko menu for all roles
        if (menu.name === "kriteria-risiko") {
            return false;
        }
        if (user?.role === "ADMIN_KLP" && menu.name === "pengelolaan-risiko") {
            return false;
        }
        // PEMILIK_RISIKO and PENGELOLA_RISIKO can access dashboards, pengelolaan-risiko, and parameters
        if ((user?.role === "PEMILIK_RISIKO" || user?.role === "PENGELOLA_RISIKO")) {
            return menu.name === "dashboards" || menu.name === "pengelolaan-risiko" || menu.name === "parameters";
        }
        if ((user?.role === "PEGAWAI" || user?.role === "PENGAWAS_INTERN") && (menu.name === "organisasi" || menu.name === "settings-unit-kerja" || menu.name === "approval" || menu.name === "proses-akhir-tahun")) {
            return false;
        }
        // Only show approval menu for SUPER_ADMIN, ADMIN_KLP, and PEMILIK_RISIKO
        if (menu.name === "approval" && user?.role !== "SUPER_ADMIN" && user?.role !== "ADMIN_KLP" && user?.role !== "PEMILIK_RISIKO" && user?.role !== "PENGELOLA_RISIKO") {
            return false;
        }
        return true;
    });

    filteredMenuList = filteredMenuList.map(menu => {
        if (menu.name === "parameters") {
            // For PEMILIK_RISIKO and PENGELOLA_RISIKO, only show Kamus Risiko and Konteks (for proposals)
            if (user?.role === "PEMILIK_RISIKO" || user?.role === "PENGELOLA_RISIKO") {
                return {
                    ...menu,
                    dropdownMenu: menu.dropdownMenu.filter(item =>
                        item.name === "Kamus Risiko" ||
                        item.name === "Konteks Sasaran" ||
                        item.name === "Konteks Probis"
                    )
                };
            }
            return {
                ...menu,
                dropdownMenu: menu.dropdownMenu.filter(item => item.name !== "Bagan Risiko")
            };
        }
        // For organisasi menu, filter out Instansi if not SUPER_ADMIN
        if (menu.name === "organisasi" && user?.role !== "SUPER_ADMIN") {
            return {
                ...menu,
                dropdownMenu: menu.dropdownMenu.filter(item => item.name !== "Instansi")
            };
        }
        if (menu.name === "pengelolaan-risiko") {
            let newDropdownMenu = menu.dropdownMenu;

            if (user?.role === "PEGAWAI" || user?.role === "PENGAWAS_INTERN") {
                newDropdownMenu = newDropdownMenu.filter(item => item.name !== "Proses Akhir Tahun");
            }

            return {
                ...menu,
                dropdownMenu: newDropdownMenu
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