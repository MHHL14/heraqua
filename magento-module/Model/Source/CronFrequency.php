<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Model\Source;

use Magento\Framework\Data\OptionSourceInterface;

class CronFrequency implements OptionSourceInterface
{
    /** @return array<int, array<string, mixed>> */
    public function toOptionArray(): array
    {
        return [
            ['value' => 'hourly', 'label' => __('Every hour')],
            ['value' => 'every_6h', 'label' => __('Every 6 hours')],
            ['value' => 'daily', 'label' => __('Daily')],
        ];
    }
}
