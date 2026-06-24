export function timeAgo(dateString: string): string {
    const date = new Date(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    const intervals: any = {
        year: Math.floor(seconds / 31536000),
        month: Math.floor(seconds / 2592000),
        week: Math.floor(seconds / 604800),
        day: Math.floor(seconds / 86400),
        hour: Math.floor(seconds / 3600),
        minute: Math.floor(seconds / 60),
    };

    let timeAgo = '';

    for (const interval in intervals) {
        if (intervals[interval] > 0) {
            timeAgo = `${intervals[interval]} ${interval}${intervals[interval] === 1 ? '' : 's'
                } ago`;
            break;
        }
    }

    return timeAgo || 'Just now';
}
