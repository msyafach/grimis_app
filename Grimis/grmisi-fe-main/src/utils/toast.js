import Swal from 'sweetalert2';

export const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        const progressBar = toast.querySelector(".swal2-timer-progress-bar");
        const type = toast.querySelector(".swal2-icon").className;
        if (progressBar) {
            progressBar.style.backgroundColor = type.includes('swal2-icon-success') ? "green" : "red";
        }
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
    },
});

export const showToast = (type, message) => {
    Swal.fire({
        toast: true,
        position: "top-end",
        icon: type,
        title: message,
        showConfirmButton: false,
        showCloseButton: true,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            const progressBar = toast.querySelector(".swal2-timer-progress-bar");
            if (progressBar) {
                switch (type) {
                    case "success":
                        progressBar.style.backgroundColor = "green";
                        break;
                    case "error":
                        progressBar.style.backgroundColor = "red";
                        break;
                    case "warning":
                        progressBar.style.backgroundColor = "orange";
                        break;
                    default:
                        progressBar.style.backgroundColor = "#3085d6"; // default blue
                }
            }
            toast.onmouseenter = Swal.stopTimer;
            toast.onmouseleave = Swal.resumeTimer;
        },
    });
};
