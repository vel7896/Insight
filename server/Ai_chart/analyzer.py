import sys
import json
import math
import re
from collections import defaultdict

# ─── Helpers ────────────────────────────────────────────────────────────────

DATE_RE = re.compile(
    r'^\d{4}-\d{2}-\d{2}|^\d{2}[\/\-]\d{2}[\/\-]\d{4}|^\d{4}[\/\-]\d{2}'
)

def is_numeric(val):
    try:
        float(str(val).replace(',', ''))
        return True
    except:
        return False

def to_float(val):
    try:
        return float(str(val).replace(',', ''))
    except:
        return 0.0

def is_date(val):
    return bool(DATE_RE.match(str(val).strip()))

def sniff_columns(dataset):
    keys = list(dataset[0].keys())
    numeric_keys, categorical_keys, date_keys = [], [], []
    for k in keys:
        vals = [row.get(k, '') for row in dataset[:20] if row.get(k, '') != '']
        date_count = sum(1 for v in vals if is_date(v))
        num_count  = sum(1 for v in vals if is_numeric(v))
        if date_count >= len(vals) * 0.5:
            date_keys.append(k)
        elif num_count >= len(vals) * 0.7:
            numeric_keys.append(k)
        else:
            categorical_keys.append(k)
    return numeric_keys, categorical_keys, date_keys

def pick_col(preferred_keywords, pool):
    """Return first column name matching any keyword (case-insensitive), else first in pool."""
    for kw in preferred_keywords:
        for col in pool:
            if kw.lower() in col.lower():
                return col
    return pool[0] if pool else None

def freq_map_top(dataset, col, top=8):
    fm = defaultdict(int)
    for row in dataset:
        fm[str(row.get(col, 'Unknown'))] += 1
    items = sorted(fm.items(), key=lambda x: x[1], reverse=True)[:top]
    return [i[0] for i in items], [i[1] for i in items]

def sum_by_category(dataset, cat_col, num_col, top=8):
    sm = defaultdict(float)
    for row in dataset:
        k = str(row.get(cat_col, 'Unknown'))
        sm[k] += to_float(row.get(num_col, 0))
    items = sorted(sm.items(), key=lambda x: x[1], reverse=True)[:top]
    return [i[0] for i in items], [int(i[1]) for i in items]

# ─── Main ────────────────────────────────────────────────────────────────────

def calculate_analytics():
    try:
        raw_input = sys.stdin.read()
        if not raw_input:
            print(json.dumps({"error": "Empty dataset input"}))
            return

        dataset = json.loads(raw_input)

        if not isinstance(dataset, list) or len(dataset) == 0:
            print(json.dumps({"error": "Invalid dataset format. Expected non-empty array of objects."}))
            return

        total_records = len(dataset)
        numeric_keys, categorical_keys, date_keys = sniff_columns(dataset)

        # ── 1. BAR CHART ── x: categorical string, y: integer count ──────────
        bar_cat = pick_col(['category', 'region', 'type', 'name', 'city', 'country', 'department'], categorical_keys)
        if bar_cat:
            bar_num = pick_col(['sales', 'revenue', 'amount', 'count', 'total', 'quantity'], numeric_keys)
            if bar_num:
                bar_labels, bar_data = sum_by_category(dataset, bar_cat, bar_num)
            else:
                bar_labels, bar_data = freq_map_top(dataset, bar_cat)
        else:
            bar_cat = list(dataset[0].keys())[0]
            bar_labels, bar_data = freq_map_top(dataset, bar_cat)
        bar_title = f"Count by {bar_cat}"

        # ── 2. PIE CHART ── Distribution / Area detail labels ────────────────
        pie_cat = pick_col(['area', 'region', 'zone', 'segment', 'category', 'country'], categorical_keys)
        if pie_cat is None:
            pie_cat = bar_cat
        pie_fm = defaultdict(int)
        for row in dataset:
            pie_fm[str(row.get(pie_cat, 'Unknown'))] += 1
        total_pie = sum(pie_fm.values()) or 1
        sorted_pie = sorted(pie_fm.items(), key=lambda x: x[1], reverse=True)[:6]
        pie_labels = [f"{k} ({round(v/total_pie*100,1)}%)" for k, v in sorted_pie]
        pie_data   = [v for _, v in sorted_pie]
        pie_title  = f"Distribution of {pie_cat}"

        # ── 3. LINE CHART ── x: product/produce category, y: int ─────────────
        line_cat = pick_col(['product', 'produce', 'item', 'sku', 'name', 'service'], categorical_keys)
        line_num = pick_col(['sales', 'revenue', 'amount', 'count', 'total', 'quantity', 'price'], numeric_keys)
        if line_cat and line_num:
            line_labels, line_data = sum_by_category(dataset, line_cat, line_num, top=12)
        elif line_cat:
            line_labels, line_data = freq_map_top(dataset, line_cat, top=12)
        else:
            line_labels = [str(i) for i in range(min(total_records, 15))]
            line_data   = [int(math.sin(i / 10.0) * 50 + 50) for i in range(len(line_labels))]
        line_title = f"{'Product' if line_cat else 'Trend'} vs {line_num or 'Count'}"

        # ── 4. SCATTER ── Variance Correlation (2 numeric axes) ───────────────
        scatter_data = []
        if len(numeric_keys) >= 2:
            n1, n2 = numeric_keys[0], numeric_keys[1]
            for row in dataset[:60]:
                try:
                    scatter_data.append({"x": to_float(row.get(n1, 0)), "y": to_float(row.get(n2, 0))})
                except: pass
        else:
            num_col = numeric_keys[0] if numeric_keys else None
            for i, row in enumerate(dataset[:40]):
                v = to_float(row.get(num_col, i)) if num_col else float(i)
                scatter_data.append({"x": float(i), "y": v})
        scatter_title = f"Variance Correlation: {numeric_keys[0] if numeric_keys else 'X'} vs {numeric_keys[1] if len(numeric_keys) > 1 else 'Y'}"

        # ── 5. DOUGHNUT ── Profit / Revenue grouped by category ──────────────
        donut_num = pick_col(['profit', 'revenue', 'income', 'sales', 'amount', 'total'], numeric_keys)
        donut_cat = pick_col(['product', 'category', 'region', 'segment', 'name'], categorical_keys)
        if donut_num and donut_cat:
            donut_labels, donut_data = sum_by_category(dataset, donut_cat, donut_num, top=6)
        elif donut_cat:
            donut_labels, donut_data = freq_map_top(dataset, donut_cat, top=6)
        else:
            donut_labels = pie_labels[:6]
            donut_data   = pie_data[:6]
        donut_title = f"{donut_num or 'Revenue'} by {donut_cat or 'Category'}"

        # ── 6. HISTOGRAM ── Expected distribution buckets of a numeric col ────
        hist_num = pick_col(['expected', 'score', 'value', 'amount', 'price', 'age', 'quantity'], numeric_keys)
        if hist_num:
            raw_vals = []
            for row in dataset:
                v = row.get(hist_num)
                if v is not None and is_numeric(v):
                    raw_vals.append(to_float(v))
            if raw_vals:
                mn, mx = min(raw_vals), max(raw_vals)
                bucket_count = min(10, max(5, int(len(raw_vals) ** 0.5)))
                width = (mx - mn) / bucket_count if mx != mn else 1
                buckets = defaultdict(int)
                for v in raw_vals:
                    idx = min(int((v - mn) / width), bucket_count - 1)
                    buckets[idx] += 1
                hist_labels = [f"{mn + i*width:.1f}–{mn + (i+1)*width:.1f}" for i in range(bucket_count)]
                hist_data   = [buckets[i] for i in range(bucket_count)]
            else:
                hist_labels, hist_data = bar_labels, bar_data
        else:
            hist_labels, hist_data = bar_labels, bar_data
        hist_title = f"Expected Distribution of {hist_num or bar_cat}"

        # ── 7. SEMICIRCLE ── Compare Product shares ───────────────────────────
        semi_cat = pick_col(['product', 'produce', 'item', 'sku', 'brand', 'name'], categorical_keys)
        semi_num = pick_col(['sales', 'revenue', 'quantity', 'amount', 'total'], numeric_keys)
        if semi_cat and semi_num:
            semi_labels, semi_data = sum_by_category(dataset, semi_cat, semi_num, top=5)
        elif semi_cat:
            semi_labels, semi_data = freq_map_top(dataset, semi_cat, top=5)
        else:
            semi_labels, semi_data = donut_labels[:5], donut_data[:5]
        semi_title = f"Product Comparison: {semi_cat or 'Category'}"

        # ── 8. RANGE CHART ── Date-driven [min, max] intervals ───────────────
        range_chart = None
        if date_keys and numeric_keys:
            date_col = date_keys[0]
            range_num = pick_col(['sales', 'revenue', 'amount', 'quantity', 'total', 'price'], numeric_keys)
            if not range_num:
                range_num = numeric_keys[0]
            period_map = defaultdict(list)
            for row in dataset:
                dval = str(row.get(date_col, '')).strip()
                nval = row.get(range_num)
                if dval and nval is not None and is_numeric(nval):
                    # Group by YYYY-MM
                    m = re.match(r'(\d{4}[-/]\d{2})', dval)
                    if m:
                        period_map[m.group(1)].append(to_float(nval))
            if period_map:
                sorted_periods = sorted(period_map.keys())[:12]
                range_labels = sorted_periods
                range_data   = [
                    [int(min(period_map[p])), int(max(period_map[p]))]
                    for p in range_labels
                ]
                range_chart = {
                    "title": f"Date Range: {range_num} over time",
                    "labels": range_labels,
                    "data": range_data
                }

        # ── KPIs ─────────────────────────────────────────────────────────────
        total_sum = 0.0
        kpi_num = pick_col(['sales', 'revenue', 'amount', 'total', 'price'], numeric_keys)
        if kpi_num:
            total_sum = sum(to_float(row.get(kpi_num, 0)) for row in dataset)
        avg_val = round(total_sum / total_records, 2) if total_records else 0

        kpis = {
            "records": total_records,
            "k1": {"label": "Total Records", "value": str(total_records)},
            "k2": {"label": f"Total {kpi_num or 'Value'}", "value": f"{total_sum:,.0f}"},
            "k3": {"label": "Average", "value": f"{avg_val:,.2f}"},
            "k4": {"label": "Categories", "value": str(len(set(str(row.get(bar_cat, '')) for row in dataset)))}
        }

        # ── Output ───────────────────────────────────────────────────────────
        charts = {
            "bar":       {"title": bar_title,    "labels": bar_labels,    "data": bar_data},
            "pie":       {"title": pie_title,    "labels": pie_labels,    "data": pie_data},
            "line":      {"title": line_title,   "labels": line_labels,   "data": line_data},
            "scatter":   {"title": scatter_title, "data": scatter_data},
            "doughnut":  {"title": donut_title,  "labels": donut_labels,  "data": donut_data},
            "histogram": {"title": hist_title,   "labels": hist_labels,   "data": hist_data},
            "semicircle":{"title": semi_title,   "labels": semi_labels,   "data": semi_data},
        }
        if range_chart:
            charts["range"] = range_chart

        print(json.dumps({"kpis": kpis, "charts": charts}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    calculate_analytics()
