package uk.co.jpperformance.fit;

/** Tests run without an Android device, SDK or third-party test framework. */
public final class WorkoutRulesTest {
    private static int checks;
    private static void check(boolean test) { checks++; if(!test) throw new AssertionError("Check "+checks); }
    private static void rejects(Runnable action) {
        boolean rejected=false;try {action.run();} catch(IllegalArgumentException e){rejected=true;}check(rejected);
    }
    public static void main(String[] args) {
        check(WorkoutRules.reps("۱۲")==12);
        check(WorkoutRules.reps("١٠")==10);
        check(WorkoutRules.weight("۱۲٫۵")==12.5);
        check(WorkoutRules.weight("0")==0);
        check(WorkoutRules.weight("1000")==1000);
        rejects(()->WorkoutRules.reps("0"));rejects(()->WorkoutRules.reps("501"));
        rejects(()->WorkoutRules.reps("1.5"));rejects(()->WorkoutRules.reps("999999999999999999"));
        rejects(()->WorkoutRules.weight("NaN"));rejects(()->WorkoutRules.weight("Infinity"));
        rejects(()->WorkoutRules.weight("-1"));rejects(()->WorkoutRules.weight("1000.1"));
        rejects(()->WorkoutRules.movement(" "));
        rejects(()->WorkoutRules.movement("x".repeat(81)));
        check(WorkoutRules.movement("  squat ").equals("squat"));
        check(WorkoutRules.remaining(60000,0)==60);
        check(WorkoutRules.remaining(60000,59999)==1);
        check(WorkoutRules.remaining(60000,60000)==0);
        check(WorkoutRules.remaining(60000,61000)==0);
        check(WorkoutRules.remaining(999999999,0)==600);
        System.out.println("PASS: "+checks+" validation and timer boundary checks");
    }
}
