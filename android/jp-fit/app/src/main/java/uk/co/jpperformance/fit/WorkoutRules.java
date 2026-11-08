package uk.co.jpperformance.fit;

/** اعتبارسنجی مستقل از رابط و تبدیل ارقام فارسی و عربی به مقدار عددی. */
public final class WorkoutRules {
    private WorkoutRules() {}
    public static String normalize(String text) {
        StringBuilder out = new StringBuilder();
        for (char c : text.trim().toCharArray()) {
            if (c >= '۰' && c <= '۹') c = (char) ('0' + c - '۰');
            if (c >= '٠' && c <= '٩') c = (char) ('0' + c - '٠');
            if (c == '٫') c = '.';
            out.append(c);
        }
        return out.toString();
    }
    public static int reps(String text) {
        int value = Integer.parseInt(normalize(text));
        if (value < 1 || value > 500) throw new IllegalArgumentException("reps");
        return value;
    }
    public static double weight(String text) {
        double value = Double.parseDouble(normalize(text));
        if (!Double.isFinite(value) || value < 0 || value > 1000) throw new IllegalArgumentException("weight");
        return value;
    }
    public static String movement(String name) {
        String value = name.trim();
        if (value.isEmpty() || value.length() > 80) throw new IllegalArgumentException("movement");
        return value;
    }
    public static long remaining(long deadline, long now) {
        return Math.max(0, Math.min(600, (deadline - now + 999) / 1000));
    }
}
