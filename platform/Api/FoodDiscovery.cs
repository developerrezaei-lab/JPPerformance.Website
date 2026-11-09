using System.Text.Json;
using System.Text.RegularExpressions;
namespace JP.Api;

// برچسب‌های جست‌وجو برای کشف غذا هستند، نه ادعای کشور منشأ یا داده تغذیه جدید.
public sealed class FoodDiscovery
{
    public static readonly string[] Categories = ["Rice", "Bread & grains", "Fruit", "Vegetables", "Protein", "Dairy", "Other"];
    public static readonly string[] Cuisines = ["UK", "India / South Asia", "Italy", "China", "Turkey", "Iran"];
    static readonly string[] Common = ["Rice, white, basmati, boiled in unsalted water", "Bananas, flesh only", "Bread, wholemeal, average", "Milk, semi-skimmed, pasteurised, average", "Eggs, chicken, whole, boiled", "Apples, eating, raw, flesh and skin", "Chicken, breast, grilled without skin, meat only", "Porridge oats, unfortified", "Yogurt, whole milk, plain"];
    readonly (string Name, string Search, string Category, string[] Tags, bool Common)[] catalog = JsonSerializer.Deserialize<Food[]>(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Catalog/foods.json")), JsonSerializerOptions.Web)!.Select(f => (f.Name, f.Name.ToLowerInvariant(), Category(f.Name), Tags(f.Name), IsCommon(f.Name))).ToArray();
    public string[] Match(string? q, string? category, string? cuisine, bool common) {
        var terms = Normalize(q).Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return catalog.Where(f => (!common || f.Common) && (string.IsNullOrEmpty(category) || category == f.Category) && (string.IsNullOrEmpty(cuisine) || f.Tags.Contains(cuisine)) && terms.All(t => Regex.IsMatch(f.Search, @"\b" + Regex.Escape(t) + @"\w*"))).Select(f=>f.Name).ToArray();
    }
    public static bool IsCommon(string name) => Common.Contains(name);
    public static string Normalize(string? value) {
        var text=(value??"").Trim().ToLowerInvariant().Replace('ي','ی').Replace('ك','ک');
        foreach(var pair in new Dictionary<string,string>{{"برنج","rice"},{"مرغ","chicken"},{"تخم مرغ","egg"},{"موز","banana"},{"سیب","apple"},{"نان","bread"},{"شیر","milk"},{"ماست","yogurt"},{"سیب زمینی","potato"},{"پاستا","pasta"}}.OrderByDescending(x=>x.Key.Length)) text=text.Replace(pair.Key,pair.Value);
        return text;
    }
    public static string Category(string name) {
        var n=name.ToLowerInvariant();
        if(Regex.IsMatch(n,@"\brice\b")||n.Contains("biryani"))return "Rice";
        if(Regex.IsMatch(n,"^(bread|pasta|oat|porridge|cereal|noodle|flour|couscous|bulgur)"))return "Bread & grains";
        if(Regex.IsMatch(n,"^(apple|banana|orange|pear|grape|peach|melon|strawberr|blueberr|date|mango|kiwi|pineapple)"))return "Fruit";
        if(Regex.IsMatch(n,"^(potato|tomato|carrot|broccoli|spinach|lettuce|cabbage|onion|aubergine|courgette|pepper|mushroom)"))return "Vegetables";
        if(Regex.IsMatch(n,"^(milk|yogurt|yoghurt|cheese|cream|butter)"))return "Dairy";
        if(Regex.IsMatch(n,"^(chicken|beef|lamb|pork|egg|fish|salmon|tuna|lentil|bean|chickpea|tofu|nut|almond)"))return "Protein";
        return "Other";
    }
    public static string[] Tags(string name) {
        var n=name.ToLowerInvariant();var tags=new List<string>();
        if(n.Contains("uk type")||n.Contains("british")||n.Contains("yorkshire")||n.Contains("shepherd"))tags.Add("UK");
        if(n.Contains("curry")||n.Contains("biryani")||n.Contains("chapati")||n.Contains("naan")||n.Contains("tikka"))tags.Add("India / South Asia");
        if(n.Contains("pasta")||n.Contains("pizza")||n.Contains("risotto")||n.Contains("lasagne"))tags.Add("Italy");
        if(n.Contains("chinese")||n.Contains("chow mein")||n.Contains("sweet and sour"))tags.Add("China");
        if(n.Contains("turkish"))tags.Add("Turkey");
        if(n.Contains("persian")||n.Contains("iranian"))tags.Add("Iran");
        return tags.ToArray();
    }
    public static string Image(string name) => "/assets/food/" + (Category(name) switch {"Rice"=>"rice","Bread & grains"=>"grains","Fruit"=>"fruit","Vegetables"=>"vegetables","Protein"=>"protein","Dairy"=>"dairy",_=>"meal"}) + ".svg";
}
