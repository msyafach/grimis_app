export const skorColorMap = {
    1: 'bg-success',
    2: 'bg-light-success',
    3: 'bg-warning',
    4: 'bg-light-danger',
    5: 'bg-danger',
};

export const getLevelBadgeClass = (level) => {
    if (level >= 1 && level <= 15) {
        return 'bg-light-success text-success';
    } else if (level >= 16 && level <= 20) {
        return 'bg-light-warning text-warning';
    } else if (level >= 21 && level <= 25) {
        return 'bg-light-danger text-danger';
    }
    return 'bg-light-secondary text-secondary';
};
