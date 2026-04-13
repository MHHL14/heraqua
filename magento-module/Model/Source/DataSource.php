<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Model\Source;

use Magento\Framework\Data\OptionSourceInterface;

class DataSource implements OptionSourceInterface
{
    /** @return array<int, array<string, mixed>> */
    public function toOptionArray(): array
    {
        return [
            ['value' => 'scraping', 'label' => __('Scraping (v2b file)')],
            ['value' => 'magento_api', 'label' => __('Magento API')],
        ];
    }
}
