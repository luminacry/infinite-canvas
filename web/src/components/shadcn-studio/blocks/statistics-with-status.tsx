import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { cn } from "@/lib/utils";

export type StatisticsCardProps = {
    value: string;
    title: string;
    status: "within" | "observe" | "exceed" | "unknown";
    className?: string;
    range: string;
    icon?: React.ReactNode;
};

// 纯中性灰阶设计：默认走低调的 muted 灰，仅 exceed（异常）保留唯一语义色 destructive。
const statusConfig = {
    within: {
        color: "bg-muted text-muted-foreground",
        label: "良好",
    },
    observe: {
        color: "bg-muted text-muted-foreground",
        label: "正常",
    },
    exceed: {
        color: "bg-destructive/10 text-destructive",
        label: "偏低",
    },
    unknown: {
        color: "bg-muted text-muted-foreground",
        label: "待统计",
    },
};

const StatisticsCard = ({ status, value, title, className, range, icon }: StatisticsCardProps) => {
    return (
        <Card className={cn("flex flex-col gap-3", className)}>
            <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
                {icon && (
                    <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md [&>svg]:size-4">
                        {icon}
                    </div>
                )}
            </CardHeader>

            <CardContent className="flex flex-col gap-3">
                <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>

                <Badge variant="outline" className={cn(statusConfig[status].color, "border-transparent font-normal")}>
                    <span>{statusConfig[status].label}</span>
                    <span className="opacity-50">·</span>
                    <span>{range}</span>
                </Badge>
            </CardContent>
        </Card>
    );
};

export default StatisticsCard;
